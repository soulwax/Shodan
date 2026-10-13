CREATE TABLE "DndCharacter" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "characterName" TEXT,
    "sheetData" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "memories" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DndCharacter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DndStoryTidbit" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DndStoryTidbit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DndCharacter_campaignId_discordUserId_key" ON "DndCharacter"("campaignId", "discordUserId");
CREATE INDEX "DndCharacter_campaignId_idx" ON "DndCharacter"("campaignId");
CREATE INDEX "DndStoryTidbit_campaignId_createdAt_idx" ON "DndStoryTidbit"("campaignId", "createdAt");

ALTER TABLE "DndCharacter" ADD CONSTRAINT "DndCharacter_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "DndCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DndStoryTidbit" ADD CONSTRAINT "DndStoryTidbit_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "DndCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
