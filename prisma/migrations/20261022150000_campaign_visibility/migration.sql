CREATE TYPE "DndStoryVisibility" AS ENUM ('SHARED', 'DM_ONLY', 'PRIVATE');

ALTER TABLE "DndServer"
    ADD COLUMN "dmRoleId" TEXT;

ALTER TABLE "DndStoryTidbit"
    ADD COLUMN "visibility" "DndStoryVisibility" NOT NULL DEFAULT 'SHARED';
