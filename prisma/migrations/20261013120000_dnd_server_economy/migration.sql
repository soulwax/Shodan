CREATE TYPE "DndTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

CREATE TABLE "DndServer" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aiNarrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DndServer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DndCampaign" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameSystem" TEXT NOT NULL DEFAULT 'D&D 5e',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DndCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DndWallet" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "goldGp" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DndWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DndTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "discordInteractionId" TEXT NOT NULL,
    "type" "DndTransactionType" NOT NULL,
    "amountGp" BIGINT NOT NULL,
    "balanceAfterGp" BIGINT NOT NULL,
    "narration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DndTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DndServer_discordId_key" ON "DndServer"("discordId");
CREATE UNIQUE INDEX "DndCampaign_serverId_name_key" ON "DndCampaign"("serverId", "name");
CREATE INDEX "DndCampaign_serverId_idx" ON "DndCampaign"("serverId");
CREATE UNIQUE INDEX "DndWallet_campaignId_discordUserId_key" ON "DndWallet"("campaignId", "discordUserId");
CREATE INDEX "DndWallet_campaignId_idx" ON "DndWallet"("campaignId");
CREATE UNIQUE INDEX "DndTransaction_discordInteractionId_key" ON "DndTransaction"("discordInteractionId");
CREATE INDEX "DndTransaction_walletId_createdAt_idx" ON "DndTransaction"("walletId", "createdAt");

ALTER TABLE "DndCampaign" ADD CONSTRAINT "DndCampaign_serverId_fkey"
    FOREIGN KEY ("serverId") REFERENCES "DndServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DndWallet" ADD CONSTRAINT "DndWallet_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "DndCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DndTransaction" ADD CONSTRAINT "DndTransaction_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "DndWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
