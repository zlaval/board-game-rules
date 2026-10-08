-- Preserve the previous bilingual behavior for documents already uploaded.
ALTER TABLE documents ADD COLUMN usage_language text NOT NULL DEFAULT 'both'
  CHECK (usage_language IN ('en','hu','both'));
ALTER TABLE documents ALTER COLUMN usage_language SET DEFAULT 'en';
