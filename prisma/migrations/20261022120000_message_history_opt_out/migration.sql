CREATE TABLE "GuildMessageHistoryOptOut" (
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "optedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuildMessageHistoryOptOut_pkey" PRIMARY KEY ("guildId", "discordUserId")
);

CREATE INDEX "GuildMessageHistoryOptOut_guildId_idx"
    ON "GuildMessageHistoryOptOut"("guildId");
