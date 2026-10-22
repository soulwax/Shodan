ALTER TABLE "DndServer"
    ADD COLUMN "divinePersonality" TEXT NOT NULL DEFAULT 'random',
    ADD CONSTRAINT "DndServer_divinePersonality_valid"
        CHECK ("divinePersonality" IN (
            'random',
            'mallow', 'pip', 'bellamy',
            'dot', 'marlow', 'quill',
            'rook', 'kit', 'vivian',
            'cressida', 'gideon', 'celeste',
            'mourningstar', 'belladonna', 'calamity'
        ));
