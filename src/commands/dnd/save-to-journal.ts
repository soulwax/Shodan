import {
  ActionRowBuilder,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { DndStoryKind } from '@prisma/client';
import { campaignChannelScope, getCampaignContext } from '../../services/dnd-campaign';
import { createCampaignStoryEntry } from '../../services/dnd-context';
import { MessageContextCommand } from '../../types/command';
import { logger } from '../../utils/logger';

export const JOURNAL_CAPTURE_MODAL_PREFIX = 'journal-capture:';
const MAX_NOTE_LENGTH = 1000;

function getMessageText(message: MessageContextMenuCommandInteraction['targetMessage']): string {
  return [
    message.content,
    ...message.embeds.flatMap(embed => [embed.title, embed.description, embed.url]),
    ...message.attachments.map(attachment => `${attachment.name}: ${attachment.url}`)
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join('\n')
    .slice(0, MAX_NOTE_LENGTH);
}

const saveToJournalCommand: MessageContextCommand = {
  data: new ContextMenuCommandBuilder()
    .setName('Save to journal')
    .setType(ApplicationCommandType.Message),
  category: 'dnd',
  cooldown: 5,

  async execute(interaction: MessageContextMenuCommandInteraction) {
    const message = interaction.targetMessage;
    if (!message.guildId) {
      await interaction.reply({ content: 'Campaign notes can only be saved from a server post.', ephemeral: true });
      return;
    }

    const note = getMessageText(message);
    if (!note) {
      await interaction.reply({ content: 'That post has no text, link, or attachment I can save to the journal.', ephemeral: true });
      return;
    }

    const input = new TextInputBuilder()
      .setCustomId('note')
      .setLabel('Campaign journal note')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(MAX_NOTE_LENGTH)
      .setRequired(true)
      .setValue(note);
    const parentChannelId = message.channel.isThread() ? message.channel.parentId : null;
    const modal = new ModalBuilder()
      .setCustomId(`${JOURNAL_CAPTURE_MODAL_PREFIX}${message.guildId}:${message.channelId}:${parentChannelId ?? '-'}:${message.id}`)
      .setTitle('Save to campaign journal')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

    await interaction.showModal(modal);
  }
};

export function isJournalCaptureModal(customId: string): boolean {
  return customId.startsWith(JOURNAL_CAPTURE_MODAL_PREFIX);
}

export async function handleJournalCaptureModal(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const values = interaction.customId.slice(JOURNAL_CAPTURE_MODAL_PREFIX.length).split(':');
    const [guildId, channelId] = values;
    const parentChannelId = values.length === 4 && values[2] !== '-' ? values[2] : null;
    const messageId = values.length === 4 ? values[3] : values[2];
    if (!guildId || !channelId || !messageId || interaction.guildId !== guildId) {
      await interaction.editReply('I couldn’t match that note to its server post. Open the post menu again and try once more.');
      return;
    }

    const content = interaction.fields.getTextInputValue('note').trim();
    if (!content) {
      await interaction.editReply('The journal note is empty. Open the post menu again and add a detail first.');
      return;
    }

    const guildName = interaction.guild?.name ?? (await interaction.client.guilds.fetch(guildId)).name;
    const campaign = (await getCampaignContext(
      guildId,
      guildName,
      campaignChannelScope(channelId, parentChannelId)
    )).campaign;
    const sourceUrl = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
    const entry = await createCampaignStoryEntry({
      campaignId: campaign.id,
      discordUserId: interaction.user.id,
      kind: DndStoryKind.EVENT,
      content: `${content}\n\nSource post: ${sourceUrl}`
    });

    await interaction.editReply(`Saved to the campaign journal as **Event** [#${entry.id.slice(0, 8)}]. Use /story show with ID ${entry.id.slice(0, 8)} to read it.`);
  } catch (error) {
    logger.error('[Story] Failed to save a message to the campaign journal:', error);
    await interaction.editReply('I couldn’t save that post to the campaign journal. Please try again.');
  }
}

export default saveToJournalCommand;
