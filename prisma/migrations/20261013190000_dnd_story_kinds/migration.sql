CREATE TYPE "DndStoryKind" AS ENUM ('EVENT', 'NPC', 'LOCATION', 'CLUE', 'QUEST', 'LORE');

ALTER TABLE "DndStoryTidbit"
  ADD COLUMN "kind" "DndStoryKind" NOT NULL DEFAULT 'EVENT';

ALTER TABLE "DndStoryTidbit"
  ADD COLUMN "interpretation" TEXT,
  ADD COLUMN "interpretedAt" TIMESTAMP(3);

ALTER TABLE "DndCampaign"
  ADD COLUMN "storyBigPicture" TEXT,
  ADD COLUMN "storyBigPictureUpdatedAt" TIMESTAMP(3);
