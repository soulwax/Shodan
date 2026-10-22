import { DndSessionStatus, DndStoryVisibility } from '@prisma/client';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { campaignChannelScope, getCampaignContext, isCampaignDm } from '../../services/dnd-campaign';
import {
  addDndSessionNote,
  endDndSession,
  getDndSessionStatus,
  publishDndSessionRecap,
  startDndSession
} from '../../services/dnd-session';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';
import { truncateAtBoundary } from '../../utils/text';

const visibilityChoices = [
  { name: 'Shared with the campaign', value: DndStoryVisibility.SHARED },
  { name: 'DM only', value: DndStoryVisibility.DM_ONLY },
  { name: 'Private to me', value: DndStoryVisibility.PRIVATE }
];

function channelIds(interaction: ChatInputCommandInteraction): string[] {
  const parentId = interaction.channel?.isThread() ? interaction.channel.parentId : null;
  return campaignChannelScope(interaction.channelId, parentId);
}

const sessionCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Track a D&D session and review its recap.')
    .addSubcommand(command => command
      .setName('start')
      .setDescription('Start a shared campaign session.')
      .addStringOption(option => option.setName('title').setDescription('Session title.').setRequired(true).setMinLength(2).setMaxLength(100))
      .addStringOption(option => option.setName('agenda').setDescription('Optional goal or tone for this session.').setMaxLength(500)))
    .addSubcommand(command => command
      .setName('note')
      .setDescription('Record an attributed session note.')
      .addStringOption(option => option.setName('text').setDescription('A decision, discovery, event, or open question.').setRequired(true).setMinLength(1).setMaxLength(1000))
      .addStringOption(option => option.setName('visibility').setDescription('Who can see this note? Defaults to shared.').addChoices(...visibilityChoices)))
    .addSubcommand(command => command.setName('status').setDescription('Show the active session, recent notes, and encounter.'))
    .addSubcommand(command => command.setName('end').setDescription('End play and draft a recap for DM review.'))
    .addSubcommand(command => command
      .setName('publish')
      .setDescription('Publish the reviewed recap to the shared campaign journal.')
      .addStringOption(option => option.setName('recap').setDescription('The final recap after reviewing the draft.').setRequired(true).setMinLength(10).setMaxLength(3900)))
    .addSubcommand(command => command.setName('draft').setDescription('Show the recap draft that is awaiting DM review.')),
  category: 'dnd',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Sessions can only be managed inside a server.', ephemeral: true });
      return;
    }

    const action = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });
    try {
      const { campaign } = await getCampaignContext(
        interaction.guild.id,
        interaction.guild.name,
        channelIds(interaction)
      );

      if (action === 'start') {
        if (!await isCampaignDm(interaction)) {
          await interaction.editReply('Only the campaign DM role or a server manager can start or close sessions. Set the role with `/campaign dm-role`.');
          return;
        }
        const title = interaction.options.getString('title', true).trim();
        const agenda = interaction.options.getString('agenda')?.trim() || null;
        const session = await startDndSession({
          campaignId: campaign.id,
          title,
          agenda,
          startedByDiscordUserId: interaction.user.id
        });
        const recentNotes = await prisma.dndStoryTidbit.findMany({
          where: { campaignId: campaign.id, visibility: DndStoryVisibility.SHARED },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { content: true }
        });
        const context = recentNotes.reverse().map(note => `• ${truncateAtBoundary(note.content, 180)}`).join('\n');
        await interaction.editReply({ content: [
          `Started **${session.title}** in **${campaign.name}**.`,
          agenda ? `Goal or tone: ${agenda}` : null,
          'Players can add attributed notes with `/session note`; choose DM-only or private visibility when needed.',
          context ? `Recent shared campaign notes:\n${context}` : 'No shared journal notes yet.'
        ].filter(Boolean).join('\n\n'), allowedMentions: { parse: [] } });
        return;
      }

      if (action === 'note') {
        const visibility = (interaction.options.getString('visibility') as DndStoryVisibility | null) ?? DndStoryVisibility.SHARED;
        if (visibility === DndStoryVisibility.DM_ONLY && !await isCampaignDm(interaction)) {
          await interaction.editReply('Only the campaign DM role or a server manager can add DM-only notes.');
          return;
        }
        const { session } = await addDndSessionNote({
          campaignId: campaign.id,
          discordUserId: interaction.user.id,
          visibility,
          content: interaction.options.getString('text', true).trim()
        });
        const label = visibility === DndStoryVisibility.DM_ONLY ? 'DM-only'
          : visibility === DndStoryVisibility.PRIVATE ? 'private' : 'shared';
        await interaction.editReply(`Added your ${label} note to **${session.title}**.`);
        return;
      }

      if (action === 'status') {
        const session = await getDndSessionStatus(campaign.id, interaction.user.id, await isCampaignDm(interaction));
        if (!session) {
          await interaction.editReply(`There is no active or reviewing session in **${campaign.name}**.`);
          return;
        }
        const activeEncounter = await prisma.dndEncounter.findFirst({
          where: { campaignId: campaign.id, isActive: true },
          orderBy: { createdAt: 'desc' },
          select: { title: true, round: true, scene: true }
        });
        const noteLines = session.notes.map(note => {
          const visibility = note.visibility === DndStoryVisibility.DM_ONLY ? ' · DM only'
            : note.visibility === DndStoryVisibility.PRIVATE ? ' · private' : '';
          return `• <@${note.discordUserId}>${visibility}: ${truncateAtBoundary(note.content, 180)}`;
        });
        const statusLabel = session.status === DndSessionStatus.REVIEWING ? 'Recap awaiting DM review' : 'In progress';
        await interaction.editReply({ content: [
          `**${session.title}** · ${statusLabel}`,
          session.agenda ? `Goal or tone: ${session.agenda}` : null,
          activeEncounter ? `Active encounter: **${activeEncounter.title}**, round ${activeEncounter.round}.${activeEncounter.scene ? `\nScene: ${truncateAtBoundary(activeEncounter.scene, 240)}` : ''}` : 'No active encounter.',
          noteLines.length ? `Recent notes:\n${noteLines.join('\n')}` : 'No notes recorded yet.',
          session.status === DndSessionStatus.REVIEWING ? 'Edit the draft with `/session publish recap:...` to finish the session.' : null
        ].filter(Boolean).join('\n\n'), allowedMentions: { parse: [] } });
        return;
      }

      if (action === 'end') {
        if (!await isCampaignDm(interaction)) {
          await interaction.editReply('Only the campaign DM role or a server manager can end sessions.');
          return;
        }
        const session = await endDndSession(campaign.id);
        const embed = new EmbedBuilder()
          .setTitle(`Recap draft · ${session.title}`)
          .setDescription(truncateAtBoundary(session.recapDraft ?? '', 3900))
          .setColor('#9B59B6')
          .setFooter({ text: 'Review and edit this draft, then publish it with /session publish. Only shared notes informed this draft.' });
        await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
        return;
      }

      if (action === 'draft') {
        if (!await isCampaignDm(interaction)) {
          await interaction.editReply('Only the campaign DM role or a server manager can view the unreviewed recap draft.');
          return;
        }
        const session = await getDndSessionStatus(campaign.id, interaction.user.id, true);
        if (!session || session.status !== DndSessionStatus.REVIEWING || !session.recapDraft) {
          await interaction.editReply('There is no recap draft awaiting review in this campaign.');
          return;
        }
        const embed = new EmbedBuilder()
          .setTitle(`Recap draft · ${session.title}`)
          .setDescription(truncateAtBoundary(session.recapDraft, 3900))
          .setColor('#9B59B6')
          .setFooter({ text: 'Review and edit this draft, then publish it with /session publish. Only shared notes informed this draft.' });
        await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
        return;
      }

      if (action === 'publish') {
        if (!await isCampaignDm(interaction)) {
          await interaction.editReply('Only the campaign DM role or a server manager can publish a session recap.');
          return;
        }
        const entry = await publishDndSessionRecap({
          campaignId: campaign.id,
          recap: interaction.options.getString('recap', true),
          discordUserId: interaction.user.id
        });
        await interaction.editReply(`Published the reviewed recap to **${campaign.name}** as [#${entry.id.slice(0, 8)}]. The session is closed.`);
      }
    } catch (error) {
      logger.error('[D&D] Session command failed:', error);
      const message = error instanceof Error && (
        error.message.startsWith('A session is already active') ||
        error.message.startsWith('The last session recap') ||
        error.message.startsWith('There is no active session') ||
        error.message.startsWith('There is no active or reviewing') ||
        error.message.startsWith('I couldn’t find a recap') ||
        error.message.startsWith('This recap was already published') ||
        error.message.startsWith('New session notes arrived') ||
        error.message.startsWith('This session changed')
      ) ? error.message : 'I couldn’t update the session. Please try again.';
      await interaction.editReply(message);
    }
  }
};

export default sessionCommand;
