ALTER TABLE "DndServer"
    ADD COLUMN "divineMeanness" INTEGER NOT NULL DEFAULT 2,
    ADD CONSTRAINT "DndServer_divineMeanness_range"
        CHECK ("divineMeanness" >= 1 AND "divineMeanness" <= 5);
