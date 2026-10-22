ALTER TABLE "DndServer"
    DROP CONSTRAINT "DndServer_divinePersonality_valid";

ALTER TABLE "DndServer"
    ADD CONSTRAINT "DndServer_divinePersonality_valid"
        CHECK ("divinePersonality" IN (
            'random',
            'mallow', 'pip', 'bellamy',
            'dot', 'marlow', 'quill',
            'rook', 'kit', 'vivian',
            'cressida', 'gideon', 'celeste',
            'mourningstar', 'belladonna', 'calamity',
            'sable', 'mothwick', 'morrow', 'blackthorn', 'silas'
        ));
