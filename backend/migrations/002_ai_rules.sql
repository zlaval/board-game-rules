ALTER TABLE versions ADD COLUMN ai_status text NOT NULL DEFAULT 'none'
  CHECK (ai_status IN ('none','complete','partial','failed','limited'));
ALTER TABLE versions ADD COLUMN ai_model text;
ALTER TABLE versions ADD COLUMN ai_error_code text;
ALTER TABLE jobs ADD COLUMN kind text NOT NULL DEFAULT 'extract' CHECK (kind IN ('extract','ai'));
ALTER TABLE jobs ADD COLUMN source_version_id uuid REFERENCES versions(id);
ALTER TABLE chunks ADD COLUMN translation_en text NOT NULL DEFAULT '';
ALTER TABLE chunks ADD COLUMN translation_hu text NOT NULL DEFAULT '';
ALTER TABLE chunks ADD COLUMN ai_keywords text NOT NULL DEFAULT '';
ALTER TABLE chunks ADD COLUMN embedding_model text;
ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(1536);
ALTER TABLE chunks DROP COLUMN search_vector;
ALTER TABLE chunks ADD COLUMN search_vector tsvector GENERATED ALWAYS AS
  (to_tsvector('simple', heading || ' ' || content || ' ' || translation_en || ' ' || translation_hu || ' ' || ai_keywords)) STORED;
CREATE INDEX chunks_search ON chunks USING gin(search_vector);
