-- Tarot reading history and legacy user/command records are not D&D data.
-- Remove their stored user identifiers and readings.
DROP TABLE IF EXISTS "Command";
DROP TABLE IF EXISTS "TarotReading";
DROP TABLE IF EXISTS "User";
