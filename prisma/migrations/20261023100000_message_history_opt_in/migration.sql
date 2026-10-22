-- Prior versions captured message history by default and cannot identify users
-- who explicitly consented. Remove that history before switching to opt-in.
DROP TABLE "GuildMessageHistory";
DROP TABLE "UserMessageHistory";
DROP TABLE "GuildMessageHistoryOptOut";

-- Create an explicit allowlist. No row means no consent and no collection.
CREATE TABLE "GuildMessageHistoryConsent" (
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "optedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backfillOptedInAt" TIMESTAMP(3),
    CONSTRAINT "GuildMessageHistoryConsent_pkey" PRIMARY KEY ("guildId", "discordUserId")
);

CREATE INDEX "GuildMessageHistoryConsent_guildId_backfillOptedInAt_idx"
    ON "GuildMessageHistoryConsent"("guildId", "backfillOptedInAt");
