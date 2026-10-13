DROP INDEX "DndTransaction_discordInteractionId_key";

CREATE UNIQUE INDEX "DndTransaction_discordInteractionId_currency_key"
  ON "DndTransaction"("discordInteractionId", "currency");
