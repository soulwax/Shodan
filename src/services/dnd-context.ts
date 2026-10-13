import { prisma } from './prisma';

export async function getMainCampaign(guildId: string, guildName: string) {
  const server = await prisma.dndServer.upsert({
    where: { discordId: guildId },
    create: { discordId: guildId, name: guildName },
    update: { name: guildName }
  });

  return prisma.dndCampaign.upsert({
    where: { serverId_name: { serverId: server.id, name: 'Main Campaign' } },
    create: { serverId: server.id, name: 'Main Campaign', isDefault: true },
    update: {}
  });
}

export async function getRecentStory(campaignId: string, take = 10): Promise<string[]> {
  const entries = await prisma.dndStoryTidbit.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
    take
  });
  return entries.reverse().map(entry => entry.content);
}
