import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js';
import { DndStoryKind, DndStoryVisibility } from '@prisma/client';
import { campaignChannelScope, getCampaignContext, isCampaignDm } from '../../services/dnd-campaign';
import { createCampaignStoryEntry, deleteCampaignStoryEntry, interpretCampaignStoryEntry, updateCampaignStoryEntry } from '../../services/dnd-context';
import { answerFromJournal, CampaignStoryNote, createCampaignBigPicture, createCampaignRecap } from '../../services/dnd-story-ai';
import { findRelevantCampaignStoryEntries, findStoryEntriesByReference, makeStoryWhere } from '../../services/dnd-story-query';
import { visibleStoryWhere } from '../../utils/dnd-visibility';
import { storyKindLabel } from '../../utils/dnd-story';
import { formatStorySnippet } from '../../presentation/dnd-story';
import { prisma } from '../../services/prisma';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const PAGE_SIZE = 10;
const BIG_PICTURE_ENTRY_LIMIT = 100;
const kindChoices = [
  { name: 'Event', value: DndStoryKind.EVENT },
  { name: 'NPC', value: DndStoryKind.NPC },
  { name: 'Location', value: DndStoryKind.LOCATION },
  { name: 'Clue', value: DndStoryKind.CLUE },
  { name: 'Quest', value: DndStoryKind.QUEST },
  { name: 'Lore', value: DndStoryKind.LORE }
];
const visibilityChoices = [
  { name: 'Shared with the campaign', value: DndStoryVisibility.SHARED },
  { name: 'DM only', value: DndStoryVisibility.DM_ONLY },
  { name: 'Private to me', value: DndStoryVisibility.PRIVATE }
];

function getKind(interaction: ChatInputCommandInteraction): DndStoryKind | undefined {
  return (interaction.options.getString('kind') as DndStoryKind | null) ?? undefined;
}

function canManageEntry(interaction: ChatInputCommandInteraction, authorId: string, canViewDm: boolean): boolean {
  return interaction.user.id === authorId || canViewDm;
}

const storyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('story')
    .setDescription('Keep, find, and ask questions about this campaign’s journal.')
    .addSubcommand(subcommand => subcommand
      .setName('add')
      .setDescription('Add a detail to the campaign journal.')
      .addStringOption(option => option.setName('tidbit').setDescription('A rumor, event, clue, NPC detail, or other note.').setRequired(true).setMaxLength(1000))
      .addStringOption(option => option.setName('kind').setDescription('Classify this note. Defaults to Event.').addChoices(...kindChoices))
      .addStringOption(option => option.setName('visibility').setDescription('Who can see this note? Defaults to shared.').addChoices(...visibilityChoices)))
    .addSubcommand(subcommand => subcommand
      .setName('recent')
      .setDescription('Browse recent journal entries.')
      .addIntegerOption(option => option.setName('page').setDescription('Page number (10 entries per page).').setMinValue(1).setMaxValue(10000))
      .addStringOption(option => option.setName('kind').setDescription('Only show entries of this type.').addChoices(...kindChoices)))
    .addSubcommand(subcommand => subcommand
      .setName('search')
      .setDescription('Search source notes and their interpretations.')
      .addStringOption(option => option.setName('query').setDescription('A name, place, clue, or phrase.').setRequired(true).setMinLength(2).setMaxLength(100))
      .addIntegerOption(option => option.setName('page').setDescription('Page number (10 entries per page).').setMinValue(1).setMaxValue(10000))
      .addStringOption(option => option.setName('kind').setDescription('Only search entries of this type.').addChoices(...kindChoices)))
    .addSubcommand(subcommand => subcommand
      .setName('show')
      .setDescription('Read a full journal entry and its interpretation.')
      .addStringOption(option => option.setName('id').setDescription('The 8-character reference shown in recent and search.').setRequired(true).setMinLength(6).setMaxLength(36)))
    .addSubcommand(subcommand => subcommand
      .setName('edit')
      .setDescription('Correct your note, or any note as a server moderator.')
      .addStringOption(option => option.setName('id').setDescription('The 8-character entry reference.').setRequired(true).setMinLength(6).setMaxLength(36))
      .addStringOption(option => option.setName('tidbit').setDescription('The corrected journal text.').setRequired(true).setMaxLength(1000))
      .addStringOption(option => option.setName('visibility').setDescription('Optionally change who can see this note.').addChoices(...visibilityChoices)))
    .addSubcommand(subcommand => subcommand
      .setName('delete')
      .setDescription('Remove your note, or any note as a server moderator.')
      .addStringOption(option => option.setName('id').setDescription('The 8-character entry reference.').setRequired(true).setMinLength(6).setMaxLength(36)))
    .addSubcommand(subcommand => subcommand
      .setName('ask')
      .setDescription('Ask a campaign question grounded in matching notes.')
      .addStringOption(option => option.setName('question').setDescription('What does the journal say?').setRequired(true).setMinLength(3).setMaxLength(300)))
    .addSubcommand(subcommand => subcommand
      .setName('interpret')
      .setDescription('Index older notes into compact, connected story memories.')
      .addIntegerOption(option => option.setName('limit').setDescription('How many unindexed notes (default 5, max 10).').setMinValue(1).setMaxValue(10)))
    .addSubcommand(subcommand => subcommand
      .setName('big-picture')
      .setDescription('Build and save a connected AI synthesis of the campaign so far.'))
    .addSubcommand(subcommand => subcommand
      .setName('recap')
      .setDescription('Summarize recent campaign memories with AI.')
      .addStringOption(option => option.setName('focus').setDescription('Optional person, place, or plot thread.').setMaxLength(100))
      .addStringOption(option => option.setName('kind').setDescription('Limit the recap to one note type.').addChoices(...kindChoices))),
  category: 'dnd',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'The campaign journal is available inside a server.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const action = interaction.options.getSubcommand();

    try {
      const channel = interaction.channel;
      const { campaign } = await getCampaignContext(
        guild.id,
        guild.name,
        campaignChannelScope(interaction.channelId, channel?.isThread() ? channel.parentId : null)
      );
      const canViewDm = await isCampaignDm(interaction);

      if (action === 'add') {
        const content = interaction.options.getString('tidbit', true).trim();
        const visibility = interaction.options.getString('visibility') as DndStoryVisibility | null ?? DndStoryVisibility.SHARED;
        if (!content) {
          await interaction.editReply('Add a little detail first, and I’ll put it in the campaign journal.');
          return;
        }
        if (visibility === DndStoryVisibility.DM_ONLY && !canViewDm) {
          await interaction.editReply('Only the configured DM role or a server manager can add DM-only notes.');
          return;
        }
        const entry = await createCampaignStoryEntry({
          campaignId: campaign.id,
          discordUserId: interaction.user.id,
          kind: getKind(interaction) ?? DndStoryKind.EVENT,
          visibility,
          content
        });
        const visibilityText = entry.visibility === DndStoryVisibility.DM_ONLY ? ' as a DM-only note'
          : entry.visibility === DndStoryVisibility.PRIVATE ? ' as a private note' : '';
        await interaction.editReply(`Added${visibilityText} as **${storyKindLabel(entry.kind)}** entry [#${entry.id.slice(0, 8)}]${entry.interpretation ? ' and connected it to the campaign memory' : ' (saved; AI interpretation is pending)'}. Use \`/story big-picture\` to build or refresh the shared campaign overview.`);
        return;
      }

      if (action === 'recent' || action === 'search') {
        const query = action === 'search' ? interaction.options.getString('query', true).trim() : undefined;
        const kind = getKind(interaction);
        const page = interaction.options.getInteger('page') ?? 1;
        const where = makeStoryWhere(campaign.id, interaction.user.id, canViewDm, { kind, query });
        const total = await prisma.dndStoryTidbit.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (page > totalPages) {
          await interaction.editReply(`That’s page ${page}, but there are only ${totalPages} page${totalPages === 1 ? '' : 's'} of matching notes.`);
          return;
        }
        const entries = await prisma.dndStoryTidbit.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE
        });
        if (!entries.length) {
          await interaction.editReply(action === 'search'
            ? `No journal notes matched “${query}”. Try another phrase or use \`/story recent\`.`
            : 'The campaign journal is blank so far. Add the first detail with `/story add`.');
          return;
        }
        const embed = new EmbedBuilder()
          .setColor(0x586b4d)
          .setTitle(action === 'search' ? `Journal search: ${query}` : `${guild.name} · Campaign journal`)
          .setDescription(entries.map(formatStorySnippet).join('\n\n'))
          .setFooter({ text: `Page ${page}/${totalPages} · ${total} ${kind ? `${storyKindLabel(kind).toLowerCase()} ` : ''}entries · Use the [#reference] with /story show, edit, or delete.` });
        await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
        return;
      }

      if (action === 'interpret') {
        const limit = interaction.options.getInteger('limit') ?? 5;
        const pending = await prisma.dndStoryTidbit.findMany({
          where: { campaignId: campaign.id, interpretation: null, ...visibleStoryWhere(interaction.user.id, canViewDm) },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit
        });
        if (!pending.length) {
          await interaction.editReply('All journal entries already have a connected interpretation. Use `/story big-picture` to synthesize them.');
          return;
        }
        let interpreted = 0;
        for (const entry of pending) {
          const interpretation = await interpretCampaignStoryEntry(campaign.id, entry.kind, entry.content, entry.id);
          if (!interpretation) continue;
          await prisma.dndStoryTidbit.update({ where: { id: entry.id }, data: { interpretation, interpretedAt: new Date() } });
          interpreted += 1;
        }
        if (interpreted) {
          await prisma.dndCampaign.update({ where: { id: campaign.id }, data: { storyBigPicture: null, storyBigPictureUpdatedAt: null } });
        }
        await interaction.editReply(interpreted
          ? `Connected ${interpreted} ${interpreted === 1 ? 'entry' : 'entries'} to the campaign memory. Run \`/story big-picture\` to refresh the shared synthesis.`
          : 'The notes remain saved, but AI could not interpret them just now. Try again later.');
        return;
      }

      if (action === 'big-picture') {
        const sharedNotes = { campaignId: campaign.id, visibility: DndStoryVisibility.SHARED };
        const entryCount = await prisma.dndStoryTidbit.count({ where: sharedNotes });
        const entries = await prisma.dndStoryTidbit.findMany({
          where: sharedNotes,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: BIG_PICTURE_ENTRY_LIMIT,
          select: { id: true, kind: true, content: true, interpretation: true }
        });
        if (!entries.length) {
          await interaction.editReply('There’s no campaign journal to synthesize yet. Add notes with `/story add` first.');
          return;
        }
        const snapshot = JSON.stringify(entries);
        const bigPicture = await createCampaignBigPicture(entries);
        const [currentCount, currentEntries] = await Promise.all([
          prisma.dndStoryTidbit.count({ where: sharedNotes }),
          prisma.dndStoryTidbit.findMany({
            where: sharedNotes,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: BIG_PICTURE_ENTRY_LIMIT,
            select: { id: true, kind: true, content: true, interpretation: true }
          })
        ]);
        if (currentCount !== entryCount || JSON.stringify(currentEntries) !== snapshot) {
          await interaction.editReply('The journal changed while I was building its big picture, so I left the saved version untouched. Run `/story big-picture` again to include the new notes.');
          return;
        }
        const updatedAt = new Date();
        await prisma.dndCampaign.update({ where: { id: campaign.id }, data: { storyBigPicture: bigPicture, storyBigPictureUpdatedAt: updatedAt } });
        const indexedCount = entries.filter(entry => entry.interpretation).length;
        const embed = new EmbedBuilder()
          .setColor(0x586b4d)
          .setTitle(`${guild.name} · Campaign big picture`)
          .setDescription(bigPicture)
          .setFooter({ text: `Built from ${entries.length === entryCount ? 'all ' : `latest ${entries.length} of ${entryCount} `}entries · ${indexedCount} stored interpretations · ${updatedAt.toLocaleString()}` });
        await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
        return;
      }

      if (action === 'show') {
        const reference = interaction.options.getString('id', true).trim();
        const matches = await findStoryEntriesByReference(campaign.id, reference, interaction.user.id, canViewDm);
        if (!matches.length) {
          await interaction.editReply(`I couldn’t find a journal entry starting with \`${reference}\`.`);
          return;
        }
        if (matches.length > 1) {
          await interaction.editReply('That reference matches more than one entry. Copy more characters from the entry ID and try again.');
          return;
        }
        const entry = matches[0];
        const embed = new EmbedBuilder()
          .setColor(0x586b4d)
          .setTitle(`[#${entry.id.slice(0, 8)}] ${storyKindLabel(entry.kind)}${entry.visibility === DndStoryVisibility.DM_ONLY ? ' · DM only' : entry.visibility === DndStoryVisibility.PRIVATE ? ' · Private' : ''}`)
          .setDescription(entry.content)
          .addFields(
            { name: 'Stored big-picture interpretation', value: entry.interpretation || 'Not interpreted yet. Use `/story interpret` to index older notes.' },
            { name: 'Added by', value: `<@${entry.discordUserId}>`, inline: true }
          )
          .setFooter({ text: entry.createdAt.toLocaleString() });
        await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
        return;
      }

      if (action === 'edit' || action === 'delete') {
        const reference = interaction.options.getString('id', true).trim();
        const matches = await findStoryEntriesByReference(campaign.id, reference, interaction.user.id, canViewDm);
        if (!matches.length) {
          await interaction.editReply(`I couldn’t find a journal entry starting with \`${reference}\`.`);
          return;
        }
        if (matches.length > 1) {
          await interaction.editReply('That reference matches more than one entry. Copy more characters from the entry ID and try again.');
          return;
        }
        const entry = matches[0];
        if (!canManageEntry(interaction, entry.discordUserId, canViewDm)) {
          await interaction.editReply('Only the note’s author or a member with DM access can change it.');
          return;
        }
        if (action === 'edit') {
          const content = interaction.options.getString('tidbit', true).trim();
          const visibility = interaction.options.getString('visibility') as DndStoryVisibility | null ?? undefined;
          if (!content) {
            await interaction.editReply('The corrected journal text can’t be empty.');
            return;
          }
          if (visibility === DndStoryVisibility.DM_ONLY && !canViewDm) {
            await interaction.editReply('Only the configured DM role or a server manager can set a note to DM-only.');
            return;
          }
          const updated = await updateCampaignStoryEntry(campaign.id, entry.id, content, visibility);
          await interaction.editReply(`Updated journal entry [#${entry.id.slice(0, 8)}]${updated?.interpretation ? ' and refreshed its stored interpretation' : '; its AI interpretation is pending'}. Rebuild the overview with \`/story big-picture\`.`);
        } else {
          await deleteCampaignStoryEntry(campaign.id, entry.id);
          await interaction.editReply(`Removed journal entry [#${entry.id.slice(0, 8)}]. Rebuild the overview with \`/story big-picture\`.`);
        }
        return;
      }

      if (action === 'ask') {
        const question = interaction.options.getString('question', true).trim();
        const relevant = await findRelevantCampaignStoryEntries(campaign.id, interaction.user.id, canViewDm, question);
        if (!relevant.length && !campaign.storyBigPicture) {
          await interaction.editReply('The journal is empty, so I don’t have campaign evidence to answer from yet. Add a note with `/story add`.');
          return;
        }
        const answer = await answerFromJournal(question, relevant, campaign.storyBigPicture);
        const embed = new EmbedBuilder()
          .setColor(0x586b4d)
          .setTitle('📖 From the campaign journal')
          .setDescription(answer)
          .setFooter({ text: relevant.length ? `Grounded in ${relevant.length} journal ${relevant.length === 1 ? 'entry' : 'entries'}.` : 'Based on the stored campaign overview.' });
        await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
        return;
      }

      if (action === 'recap') {
        const kind = getKind(interaction);
        const focus = interaction.options.getString('focus')?.trim();
        const entries = await prisma.dndStoryTidbit.findMany({
          where: makeStoryWhere(campaign.id, interaction.user.id, canViewDm, { kind, query: focus }),
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 50,
          select: { id: true, kind: true, content: true, interpretation: true }
        });
        if (!entries.length) {
          await interaction.editReply('There are no journal entries to recap for that selection yet. Add a note with `/story add`.');
          return;
        }
        const recap = await createCampaignRecap(entries.reverse() as CampaignStoryNote[], campaign.storyBigPicture, focus);
        const embed = new EmbedBuilder()
          .setColor(0x586b4d)
          .setTitle(`${guild.name} · Campaign recap`)
          .setDescription(recap)
          .setFooter({ text: `Based on ${entries.length} recent ${kind ? `${storyKindLabel(kind).toLowerCase()} ` : ''}journal entries${focus ? ` about “${focus}”` : ''}.` });
        await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
      }
    } catch (error) {
      logger.error('[D&D] Story command failed:', error);
      await interaction.editReply('I couldn’t update or read the campaign journal just now. Please try again.');
    }
  }
};

export default storyCommand;
