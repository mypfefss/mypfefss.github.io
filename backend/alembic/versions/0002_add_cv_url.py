"""add cv_url for shared CV links

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-13 00:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("registrations", sa.Column("cv_url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("registrations", "cv_url")
