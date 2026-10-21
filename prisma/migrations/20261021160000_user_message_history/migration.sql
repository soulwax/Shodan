CREATE TABLE "UserMessageHistory" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserMessageHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuildMessageHistory" (
    "id" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "discordMessageId" TEXT NOT NULL,
    "discordChannelId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuildMessageHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserMessageHistory_guildId_discordUserId_key"
    ON "UserMessageHistory"("guildId", "discordUserId");
CREATE INDEX "UserMessageHistory_guildId_idx"
    ON "UserMessageHistory"("guildId");
CREATE UNIQUE INDEX "GuildMessageHistory_discordMessageId_key"
    ON "GuildMessageHistory"("discordMessageId");
CREATE INDEX "GuildMessageHistory_historyId_createdAt_idx"
    ON "GuildMessageHistory"("historyId", "createdAt");

ALTER TABLE "GuildMessageHistory"
    ADD CONSTRAINT "GuildMessageHistory_historyId_fkey"
    FOREIGN KEY ("historyId") REFERENCES "UserMessageHistory"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
