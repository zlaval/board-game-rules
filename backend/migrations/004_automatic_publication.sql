-- Make the newest successful version available for each existing document.
-- Failed and unfinished versions never replace usable rules.
DO $$
DECLARE
    candidate record;
BEGIN
    FOR candidate IN
        SELECT DISTINCT ON (document_id) id, document_id
        FROM versions
        WHERE status IN ('ready', 'published')
        ORDER BY document_id, created_at DESC, id DESC
    LOOP
        PERFORM id FROM documents WHERE id = candidate.document_id FOR UPDATE;
        UPDATE versions SET status = 'ready', published_at = NULL
        WHERE document_id = candidate.document_id AND status = 'published' AND id <> candidate.id;
        UPDATE versions SET status = 'published', published_at = COALESCE(published_at, now())
        WHERE id = candidate.id;
    END LOOP;
END $$;

UPDATE versions SET stage = 'ready' WHERE status IN ('ready', 'published');
