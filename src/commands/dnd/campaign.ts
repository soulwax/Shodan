// Copyright (C) 2025 soulwax@github
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import {
  archiveCampaign,
  bindCampaignChannel,
  campaignChannelScope,
  createCampaign,
  getCampaignContext,
  listCampaigns,
  renameCampaign,
  restoreCampaign,
  setCampaignDmRole,
  setDefaultCampaign,
  unbindCampaignChannel
} from '../../services/dnd-campaign';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

const channelTypes = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum] as const;

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function channelScope(interaction: ChatInputCommandInteraction): string[] {
  const channel = interaction.channel;
  const parentId = channel?.isThread() ? channel.parentId : null;
  return campaignChannelScope(interaction.channelId, parentId);
}

const campaignCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('campaign')
    .setDescription('Manage this server’s D&D campaigns.')
    .addSubcommand(command => command.setName('list').setDescription('List active and archived campaigns.'))
    .addSubcommand(command => command.setName('show').setDescription('Show the campaign used in this channel.'))
    .addSubcommand(command => command
      .setName('create')
      .setDescription('Create a campaign for this server.')
      .addStringOption(option => option.setName('name').setDescription('Campaign name.').setRequired(true).setMinLength(2).setMaxLength(80)))
    .addSubcommand(command => command
      .setName('default')
      .setDescription('Set the server’s default campaign.')
      .addStringOption(option => option.setName('name').setDescription('Name of an active campaign.').setRequired(true).setMaxLength(80)))
    .addSubcommand(command => command
      .setName('bind')
      .setDescription('Use a campaign by default in a channel and its threads.')
      .addStringOption(option => option.setName('name').setDescription('Name of an active campaign.').setRequired(true).setMaxLength(80))
      .addChannelOption(option => option.setName('channel').setDescription('Campaign channel.').setRequired(true).addChannelTypes(...channelTypes)))
    .addSubcommand(command => command
      .setName('unbind')
      .setDescription('Remove a channel campaign assignment.')
      .addChannelOption(option => option.setName('channel').setDescription('Channel to unbind; defaults to this channel.').addChannelTypes(...channelTypes)))
    .addSubcommand(command => command
      .setName('rename')
      .setDescription('Rename an active campaign.')
      .addStringOption(option => option.setName('name').setDescription('Current campaign name.').setRequired(true).setMaxLength(80))
      .addStringOption(option => option.setName('new_name').setDescription('New campaign name.').setRequired(true).setMinLength(2).setMaxLength(80)))
    .addSubcommand(command => command
      .setName('dm-role')
      .setDescription('Set or clear the role that can manage DM-only journal notes.')
      .addRoleOption(option => option.setName('role').setDescription('Omit to restrict DM-only access to server managers.')))
    .addSubcommand(command => command
      .setName('archive')
      .setDescription('Archive a campaign while keeping its records.')
      .addStringOption(option => option.setName('name').setDescription('Name of an active campaign.').setRequired(true).setMaxLength(80)))
    .addSubcommand(command => command
      .setName('restore')
      .setDescription('Restore an archived campaign.')
      .addStringOption(option => option.setName('name').setDescription('Name of an archived campaign.').setRequired(true).setMaxLength(80))),
  category: 'dnd',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'Campaigns can only be managed inside a server.', ephemeral: true });
      return;
    }

    const action = interaction.options.getSubcommand();
    if (action !== 'list' && action !== 'show' && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: 'You need Manage Server permission to change campaign settings.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      const context = await getCampaignContext(guild.id, guild.name, channelScope(interaction));
      const serverId = context.server.id;

      if (action === 'list') {
        const campaigns = await listCampaigns(serverId);
        if (!campaigns.length) {
          await interaction.editReply('No campaigns yet. A server manager can create one with `/campaign create`.');
          return;
        }
        await interaction.editReply(campaigns.map(campaign =>
          `${campaign.isArchived ? '📦' : campaign.isDefault ? '⭐' : '🎲'} **${campaign.name}**${campaign.isDefault ? ' · server default' : ''}${campaign.isArchived ? ' · archived' : ''} · ${campaign.gameSystem}`
        ).join('\n'));
        return;
      }

      if (action === 'show') {
        const { campaign } = context;
        const dmRole = context.server.dmRoleId ? `<@&${context.server.dmRoleId}>` : 'Manage Server permission';
        await interaction.editReply(`This channel uses **${campaign.name}** (${campaign.gameSystem})${campaign.isDefault ? ', the server default' : ', assigned to this channel'}. DM-only notes are visible to ${dmRole}.`);
        return;
      }

      if (action === 'create') {
        const name = normalizeName(interaction.options.getString('name', true));
        if (name.length < 2) {
          await interaction.editReply('Campaign names need at least two characters.');
          return;
        }
        const campaign = await createCampaign(serverId, name);
        await interaction.editReply(`Created **${campaign.name}**${campaign.isDefault ? ' as the server default' : ''}. Use \`/campaign bind\` to assign it to a channel.`);
        return;
      }

      if (action === 'default') {
        const name = normalizeName(interaction.options.getString('name', true));
        const campaign = await setDefaultCampaign(serverId, name);
        await interaction.editReply(`**${campaign.name}** is now the server’s default campaign. Channel assignments remain in effect.`);
        return;
      }

      if (action === 'bind') {
        const name = normalizeName(interaction.options.getString('name', true));
        const channel = interaction.options.getChannel('channel', true);
        if ('guildId' in channel && channel.guildId !== guild.id) {
          await interaction.editReply('Choose a channel from this server.');
          return;
        }
        await bindCampaignChannel(serverId, name, channel.id);
        await interaction.editReply(`This channel and its threads now use **${name}**.`);
        return;
      }

      if (action === 'unbind') {
        const selectedChannel = interaction.options.getChannel('channel');
        const channelId = selectedChannel?.id ?? channelScope(interaction)[0];
        if (selectedChannel && 'guildId' in selectedChannel && selectedChannel.guildId !== guild.id) {
          await interaction.editReply('Choose a channel from this server.');
          return;
        }
        const removed = await unbindCampaignChannel(serverId, channelId);
        await interaction.editReply(removed
          ? 'Removed the channel assignment. This channel now uses the server default campaign.'
          : 'This channel has no campaign assignment.');
        return;
      }

      if (action === 'rename') {
        const name = normalizeName(interaction.options.getString('name', true));
        const newName = normalizeName(interaction.options.getString('new_name', true));
        if (newName.length < 2) {
          await interaction.editReply('Campaign names need at least two characters.');
          return;
        }
        const campaign = await renameCampaign(serverId, name, newName);
        await interaction.editReply(`Renamed the campaign to **${campaign.name}**.`);
        return;
      }

      if (action === 'dm-role') {
        const role = interaction.options.getRole('role');
        await setCampaignDmRole(serverId, role?.id ?? null);
        await interaction.editReply(role
          ? `Members with ${role} can now view and manage DM-only campaign notes. Server managers retain access.`
          : 'Cleared the DM role. Only members with Manage Server can view and manage DM-only notes.');
        return;
      }

      if (action === 'archive') {
        const campaign = await archiveCampaign(serverId, normalizeName(interaction.options.getString('name', true)));
        await interaction.editReply(`Archived **${campaign.name}**. Its records are preserved, and assigned channels now fall back to the default campaign.`);
        return;
      }

      if (action === 'restore') {
        const campaign = await restoreCampaign(serverId, normalizeName(interaction.options.getString('name', true)));
        await interaction.editReply(`Restored **${campaign.name}**. Set it as the server default or bind it to a channel to use it.`);
      }
    } catch (error) {
      logger.error('[D&D] Campaign command failed:', error);
      const message = error instanceof Error && (
        error.message.startsWith('I couldn’t find') ||
        error.message.startsWith('Set a different default') ||
        error.message.includes('already exists')
      ) ? error.message : 'I couldn’t update the campaign settings. Check the campaign name and try again.';
      await interaction.editReply(message);
    }
  }
};

export default campaignCommand;
