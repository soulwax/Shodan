CREATE TABLE "DndEncounter" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "scene" TEXT,
  "round" INTEGER NOT NULL DEFAULT 1,
  "currentTurnIndex" INTEGER NOT NULL DEFAULT -1,
  "turnOrder" JSONB NOT NULL DEFAULT '[]',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByDiscordUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "DndEncounter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DndEncounter_campaignId_fkey" FOREIGN KEY ("campaignId")
    REFERENCES "DndCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DndEncounter_campaignId_isActive_createdAt_idx"
  ON "DndEncounter"("campaignId", "isActive", "createdAt");
