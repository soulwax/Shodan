-- CreateEnum
CREATE TYPE "DndSessionStatus" AS ENUM ('ACTIVE', 'REVIEWING', 'ENDED');

-- CreateTable
CREATE TABLE "DndSession" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agenda" TEXT,
    "status" "DndSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "recapDraft" TEXT,
    "startedByDiscordUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "DndSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DndSessionNote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "visibility" "DndStoryVisibility" NOT NULL DEFAULT 'SHARED',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DndSessionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DndSession_campaignId_status_createdAt_idx" ON "DndSession"("campaignId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DndSessionNote_sessionId_createdAt_idx" ON "DndSessionNote"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "DndSessionNote_sessionId_visibility_discordUserId_idx" ON "DndSessionNote"("sessionId", "visibility", "discordUserId");

-- AddForeignKey
ALTER TABLE "DndSession" ADD CONSTRAINT "DndSession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "DndCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DndSessionNote" ADD CONSTRAINT "DndSessionNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DndSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
