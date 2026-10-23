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

import { Prisma } from '@prisma/client';
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { prisma } from './prisma';
export { campaignChannelScope } from '../utils/dnd-campaign-scope';

async function ensureServer(guildId: string, guildName: string) {
  return prisma.dndServer.upsert({
    where: { discordId: guildId },
    create: { discordId: guildId, name: guildName },
    update: { name: guildName }
  });
}

async function resolveDefaultCampaign(serverId: string) {
  return prisma.$transaction(async transaction => {
    let campaign = await transaction.dndCampaign.findFirst({
      where: { serverId, isDefault: true, isArchived: false },
      orderBy: { createdAt: 'asc' }
    });
    if (campaign) return campaign;

    campaign = await transaction.dndCampaign.findFirst({
      where: { serverId, name: 'Main Campaign', isArchived: false }
    }) ?? await transaction.dndCampaign.findFirst({
      where: { serverId, isArchived: false },
      orderBy: { createdAt: 'asc' }
    });

    if (!campaign) {
      campaign = await transaction.dndCampaign.create({
        data: { serverId, name: 'Main Campaign', isDefault: true }
      });
      return campaign;
    }

    await transaction.dndCampaign.updateMany({
      where: { serverId, isDefault: true },
      data: { isDefault: false }
    });
    return transaction.dndCampaign.update({
      where: { id: campaign.id },
      data: { isDefault: true }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Resolve the shared campaign for a channel. A channel assignment wins, then
 * the server default is used. Thread callers should pass their parent channel
 * after their own channel ID so the whole campaign channel shares one scope.
 */
export async function getCampaignContext(
  guildId: string,
  guildName: string,
  channelIds: string[] = []
) {
  const server = await ensureServer(guildId, guildName);

  for (const discordChannelId of [...new Set(channelIds)]) {
    const binding = await prisma.dndCampaignChannel.findUnique({
      where: { discordChannelId },
      include: { campaign: true }
    });
    if (binding?.campaign.serverId === server.id && !binding.campaign.isArchived) {
      return { server, campaign: binding.campaign };
    }
  }

  const campaign = await resolveDefaultCampaign(server.id);
  return { server, campaign };
}

/** Resolve the server and its default campaign, creating them on first use. */
export async function getMainCampaignContext(guildId: string, guildName: string) {
  return getCampaignContext(guildId, guildName);
}

export async function getMainCampaign(guildId: string, guildName: string) {
  const { campaign } = await getMainCampaignContext(guildId, guildName);
  return campaign;
}

export async function listCampaigns(serverId: string) {
  return prisma.dndCampaign.findMany({
    where: { serverId },
    orderBy: [{ isArchived: 'asc' }, { isDefault: 'desc' }, { createdAt: 'asc' }]
  });
}

export async function findActiveCampaign(serverId: string, name: string) {
  return prisma.dndCampaign.findFirst({
    where: { serverId, name: { equals: name.trim(), mode: 'insensitive' }, isArchived: false }
  });
}

export async function createCampaign(serverId: string, name: string, gameSystem = 'D&D 5e') {
  return prisma.$transaction(async transaction => {
    const hasDefault = await transaction.dndCampaign.findFirst({
      where: { serverId, isDefault: true, isArchived: false },
      select: { id: true }
    });
    return transaction.dndCampaign.create({
      data: { serverId, name: name.trim(), gameSystem, isDefault: !hasDefault }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function setDefaultCampaign(serverId: string, name: string) {
  return prisma.$transaction(async transaction => {
    const target = await transaction.dndCampaign.findFirst({
      where: { serverId, name: { equals: name.trim(), mode: 'insensitive' }, isArchived: false }
    });
    if (!target) throw new Error(`I couldn’t find an active campaign named “${name}”.`);
    await transaction.dndCampaign.updateMany({
      where: { serverId, isDefault: true },
      data: { isDefault: false }
    });
    return transaction.dndCampaign.update({
      where: { id: target.id },
      data: { isDefault: true }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function renameCampaign(serverId: string, currentName: string, newName: string) {
  const campaign = await findActiveCampaign(serverId, currentName);
  if (!campaign) throw new Error(`I couldn’t find an active campaign named “${currentName}”.`);
  return prisma.dndCampaign.update({ where: { id: campaign.id }, data: { name: newName.trim() } });
}

export async function archiveCampaign(serverId: string, name: string) {
  return prisma.$transaction(async transaction => {
    const campaign = await transaction.dndCampaign.findFirst({
      where: { serverId, name: { equals: name.trim(), mode: 'insensitive' }, isArchived: false }
    });
    if (!campaign) throw new Error(`I couldn’t find an active campaign named “${name}”.`);
    if (campaign.isDefault) throw new Error('Set a different default campaign before archiving this one.');
    const archived = await transaction.dndCampaign.updateMany({
      where: { id: campaign.id, isDefault: false, isArchived: false },
      data: { isArchived: true }
    });
    if (!archived.count) throw new Error('Set a different default campaign before archiving this one.');
    return transaction.dndCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function restoreCampaign(serverId: string, name: string) {
  const campaign = await prisma.dndCampaign.findFirst({
    where: { serverId, name: { equals: name.trim(), mode: 'insensitive' }, isArchived: true }
  });
  if (!campaign) throw new Error(`I couldn’t find an archived campaign named “${name}”.`);
  return prisma.dndCampaign.update({ where: { id: campaign.id }, data: { isArchived: false } });
}

export async function bindCampaignChannel(serverId: string, name: string, discordChannelId: string) {
  return prisma.$transaction(async transaction => {
    const campaign = await transaction.dndCampaign.findFirst({
      where: { serverId, name: { equals: name.trim(), mode: 'insensitive' }, isArchived: false }
    });
    if (!campaign) throw new Error(`I couldn’t find an active campaign named “${name}”.`);
    const existing = await transaction.dndCampaignChannel.findUnique({
      where: { discordChannelId },
      include: { campaign: { select: { serverId: true } } }
    });
    if (existing && existing.campaign.serverId !== serverId) {
      throw new Error('That channel is already assigned to a campaign in another server.');
    }
    return transaction.dndCampaignChannel.upsert({
      where: { discordChannelId },
      create: { discordChannelId, campaignId: campaign.id },
      update: { campaignId: campaign.id }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function unbindCampaignChannel(serverId: string, discordChannelId: string) {
  const binding = await prisma.dndCampaignChannel.findUnique({
    where: { discordChannelId },
    include: { campaign: { select: { serverId: true } } }
  });
  if (!binding || binding.campaign.serverId !== serverId) return false;
  await prisma.dndCampaignChannel.delete({ where: { discordChannelId } });
  return true;
}

export async function setCampaignDmRole(serverId: string, roleId: string | null) {
  return prisma.dndServer.update({ where: { id: serverId }, data: { dmRoleId: roleId } });
}

export async function isCampaignDm(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (!interaction.guild) return false;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;

  const server = await prisma.dndServer.findUnique({
    where: { discordId: interaction.guild.id },
    select: { dmRoleId: true }
  });
  if (!server?.dmRoleId) return false;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  return member.roles.cache.has(server.dmRoleId);
}
