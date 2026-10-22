ALTER TABLE "DndCampaign"
    ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DndCampaignChannel" (
    "id" TEXT NOT NULL,
    "discordChannelId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DndCampaignChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DndCampaignChannel_discordChannelId_key"
    ON "DndCampaignChannel"("discordChannelId");
CREATE INDEX "DndCampaignChannel_campaignId_idx"
    ON "DndCampaignChannel"("campaignId");
ALTER TABLE "DndCampaignChannel"
    ADD CONSTRAINT "DndCampaignChannel_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "DndCampaign"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
