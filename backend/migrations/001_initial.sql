CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE games (
    id uuid PRIMARY KEY,
    title text NOT NULL CHECK (length(title) BETWEEN 1 AND 150),
    edition text NOT NULL DEFAULT '',
    language text NOT NULL DEFAULT 'hu',
    description text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE documents (
    id uuid PRIMARY KEY,
    game_id uuid NOT NULL REFERENCES games(id),
    filename text NOT NULL,
    format text NOT NULL CHECK (format IN ('txt', 'md', 'pdf', 'png', 'jpg', 'jpeg', 'webp')),
    language text NOT NULL,
    size_bytes bigint NOT NULL,
    sha256 text NOT NULL,
    source_path text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (game_id, sha256)
);

CREATE TABLE versions (
    id uuid PRIMARY KEY,
    document_id uuid NOT NULL REFERENCES documents(id),
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','ready','published','failed')),
    stage text NOT NULL DEFAULT 'Feldolgozásra vár',
    progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    error text,
    page_count integer NOT NULL DEFAULT 0,
    character_count integer NOT NULL DEFAULT 0,
    processor text,
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    published_at timestamptz
);
CREATE UNIQUE INDEX one_published_version ON versions(document_id) WHERE status = 'published';
CREATE INDEX version_document ON versions(document_id, created_at DESC);

CREATE TABLE jobs (
    id uuid PRIMARY KEY,
    version_id uuid NOT NULL UNIQUE REFERENCES versions(id),
    state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','done','failed')),
    attempts integer NOT NULL DEFAULT 0,
    lease_until timestamptz,
    lease_token uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_state ON jobs(state, created_at);

CREATE TABLE chunks (
    id uuid PRIMARY KEY,
    version_id uuid NOT NULL REFERENCES versions(id),
    ordinal integer NOT NULL,
    heading text NOT NULL DEFAULT '',
    content text NOT NULL,
    page integer,
    source_ref text NOT NULL,
    provenance jsonb NOT NULL DEFAULT '[]'::jsonb,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', heading || ' ' || content)) STORED,
    embedding vector,
    UNIQUE(version_id, ordinal)
);
CREATE INDEX chunks_version ON chunks(version_id);
CREATE INDEX chunks_search ON chunks USING gin(search_vector);

CREATE TABLE assets (
    id uuid PRIMARY KEY,
    version_id uuid NOT NULL REFERENCES versions(id),
    ordinal integer NOT NULL,
    path text NOT NULL,
    caption text NOT NULL DEFAULT '',
    page integer,
    provenance jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX assets_version ON assets(version_id);

CREATE TABLE sessions (
    token_hash text PRIMARY KEY,
    expires_at timestamptz NOT NULL
);

