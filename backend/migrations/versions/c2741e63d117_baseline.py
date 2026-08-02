"""baseline

Revision ID: c2741e63d117
Revises:
Create Date: 2026-08-01 22:15:10.622525

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c2741e63d117'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


UP_STATEMENTS = [
    "CREATE TYPE versiontrigger AS ENUM ('compile', 'idle', 'restore')",
    "CREATE TYPE collaboratorrole AS ENUM ('reader', 'writer')",
    "CREATE TYPE collaboratorstatus AS ENUM ('pending', 'accepted')",
    """
CREATE TABLE users (
	id UUID NOT NULL,
	email VARCHAR NOT NULL,
	hashed_password VARCHAR NOT NULL,
	is_active BOOLEAN NOT NULL,
	is_superuser BOOLEAN NOT NULL,
	is_verified BOOLEAN NOT NULL,
	first_name VARCHAR,
	last_name VARCHAR,
	PRIMARY KEY (id)
)""",
    "CREATE INDEX ix_users_id ON users (id)",
    "CREATE UNIQUE INDEX ix_users_email ON users (email)",
    """
CREATE TABLE documents (
	id UUID NOT NULL,
	user_id UUID NOT NULL,
	title VARCHAR NOT NULL,
	template VARCHAR NOT NULL,
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id)
)""",
    "CREATE INDEX ix_documents_user_id ON documents (user_id)",
    """
CREATE TABLE profiles (
	id UUID NOT NULL,
	user_id UUID NOT NULL,
	headline VARCHAR,
	bio VARCHAR,
	picture_url VARCHAR,
	phone_number VARCHAR,
	location VARCHAR,
	driving_license VARCHAR,
	linkedin_url VARCHAR,
	github_url VARCHAR,
	website_url VARCHAR,
	tier VARCHAR NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (user_id),
	FOREIGN KEY(user_id) REFERENCES users (id)
)""",
    """
CREATE TABLE document_versions (
	id UUID NOT NULL,
	document_id UUID NOT NULL,
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	trigger versiontrigger NOT NULL,
	author VARCHAR NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(document_id) REFERENCES documents (id)
)""",
    "CREATE INDEX ix_document_versions_document_id ON document_versions (document_id)",
    "CREATE INDEX ix_document_versions_created_at ON document_versions (created_at)",
    """
CREATE TABLE document_files (
	id UUID NOT NULL,
	document_id UUID NOT NULL,
	name VARCHAR NOT NULL,
	language VARCHAR NOT NULL,
	content VARCHAR NOT NULL,
	line_authors JSON,
	last_checkpoint_content VARCHAR,
	PRIMARY KEY (id),
	FOREIGN KEY(document_id) REFERENCES documents (id)
)""",
    "CREATE INDEX ix_document_files_document_id ON document_files (document_id)",
    """
CREATE TABLE document_collaborators (
	id UUID NOT NULL,
	document_id UUID NOT NULL,
	user_id UUID NOT NULL,
	invited_by_id UUID NOT NULL,
	role collaboratorrole NOT NULL,
	status collaboratorstatus NOT NULL,
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(document_id) REFERENCES documents (id),
	FOREIGN KEY(user_id) REFERENCES users (id),
	FOREIGN KEY(invited_by_id) REFERENCES users (id)
)""",
    "CREATE INDEX ix_document_collaborators_document_id ON document_collaborators (document_id)",
    "CREATE INDEX ix_document_collaborators_user_id ON document_collaborators (user_id)",
    """
CREATE TABLE document_file_versions (
	id UUID NOT NULL,
	file_id UUID NOT NULL,
	commit_id UUID NOT NULL,
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	trigger versiontrigger NOT NULL,
	author VARCHAR NOT NULL,
	reverse_patch VARCHAR NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(file_id) REFERENCES document_files (id),
	FOREIGN KEY(commit_id) REFERENCES document_versions (id)
)""",
    "CREATE INDEX ix_document_file_versions_file_id ON document_file_versions (file_id)",
    "CREATE INDEX ix_document_file_versions_commit_id ON document_file_versions (commit_id)",
    "CREATE INDEX ix_document_file_versions_created_at ON document_file_versions (created_at)",
]

DOWN_STATEMENTS = [
    "DROP TABLE document_file_versions",
    "DROP TABLE document_collaborators",
    "DROP TABLE document_files",
    "DROP TABLE document_versions",
    "DROP TABLE profiles",
    "DROP TABLE documents",
    "DROP TABLE users",
    "DROP TYPE collaboratorstatus",
    "DROP TYPE collaboratorrole",
    "DROP TYPE versiontrigger",
]


def upgrade() -> None:
    for stmt in UP_STATEMENTS:
        op.execute(stmt)


def downgrade() -> None:
    for stmt in DOWN_STATEMENTS:
        op.execute(stmt)
