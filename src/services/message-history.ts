import { Prisma } from '@prisma/client';

/** Serialize capture and privacy changes for one user in one server. */
export async function lockGuildUserHistory(
  transaction: Prisma.TransactionClient,
  guildId: string,
  discordUserId: string
): Promise<void> {
  const lockKey = `${guildId}:${discordUserId}`;
  await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
}
