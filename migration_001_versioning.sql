BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'versiontrigger') THEN
        CREATE TYPE versiontrigger AS ENUM ('compile', 'idle', 'restore');
    END IF;
END$$;

ALTER TABLE document_files
    ADD COLUMN IF NOT EXISTS last_checkpoint_content TEXT;

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    trigger versiontrigger NOT NULL,
    author VARCHAR NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_document_versions_document_id ON document_versions (document_id);
CREATE INDEX IF NOT EXISTS ix_document_versions_created_at ON document_versions (created_at);

CREATE TABLE IF NOT EXISTS document_file_versions (
    id UUID PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES document_files(id),
    commit_id UUID NOT NULL REFERENCES document_versions(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    trigger versiontrigger NOT NULL,
    author VARCHAR NOT NULL,
    reverse_patch TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_document_file_versions_file_id ON document_file_versions (file_id);
CREATE INDEX IF NOT EXISTS ix_document_file_versions_commit_id ON document_file_versions (commit_id);
CREATE INDEX IF NOT EXISTS ix_document_file_versions_created_at ON document_file_versions (created_at);

COMMIT;
