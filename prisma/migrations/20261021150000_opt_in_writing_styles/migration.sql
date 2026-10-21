CREATE TABLE "UserWritingStyle" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "profile" JSONB NOT NULL DEFAULT '{}',
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserWritingStyle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserWritingStyle_serverId_discordUserId_key"
    ON "UserWritingStyle"("serverId", "discordUserId");
CREATE INDEX "UserWritingStyle_serverId_idx" ON "UserWritingStyle"("serverId");

ALTER TABLE "UserWritingStyle"
    ADD CONSTRAINT "UserWritingStyle_serverId_fkey"
    FOREIGN KEY ("serverId") REFERENCES "DndServer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
