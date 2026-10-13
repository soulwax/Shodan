import { prisma } from './prisma';

/** Resolve the server and its default campaign, creating them on first use. */
export async function getMainCampaignContext(guildId: string, guildName: string) {
  const server = await prisma.dndServer.upsert({
    where: { discordId: guildId },
    create: { discordId: guildId, name: guildName },
    update: { name: guildName }
  });

  const campaign = await prisma.dndCampaign.upsert({
    where: { serverId_name: { serverId: server.id, name: 'Main Campaign' } },
    create: { serverId: server.id, name: 'Main Campaign', isDefault: true },
    update: {}
  });

  return { server, campaign };
}

export async function getMainCampaign(guildId: string, guildName: string) {
  const { campaign } = await getMainCampaignContext(guildId, guildName);
  return campaign;
}
