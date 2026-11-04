"""initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="editor"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "schedule_items",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("edition", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("time", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column("location", sa.String(200), nullable=True),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("speaker_name", sa.String(200), nullable=True),
        sa.Column("speaker_company", sa.String(200), nullable=True),
        sa.Column("sections", sa.JSON(), nullable=True),
        sa.Column("chips", sa.JSON(), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "workshops",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("icon", sa.String(100), nullable=False, server_default="fas fa-clock"),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("time", sa.String(100), nullable=False),
        sa.Column("description", sa.String(1000), nullable=False),
        sa.Column("features", sa.JSON(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="true"),
    )

    op.create_table(
        "registrations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("university", sa.String(200), nullable=False),
        sa.Column("field", sa.String(200), nullable=True),
        sa.Column("level", sa.String(50), nullable=False),
        sa.Column("graduation", sa.String(50), nullable=True),
        sa.Column("workshops", sa.JSON(), nullable=True),
        sa.Column("interests", sa.String(500), nullable=True),
        sa.Column("experience", sa.String(50), nullable=True),
        sa.Column("company_name", sa.String(200), nullable=True),
        sa.Column("edition", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("cv_key", sa.String(300), nullable=True),
        sa.Column("cv_original_name", sa.String(255), nullable=True),
        sa.Column("cv_size", sa.Integer(), nullable=True),
        sa.Column("cv_consent", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("email", "edition", "type", name="uq_registration"),
    )
    op.create_index("ix_registrations_email", "registrations", ["email"])

    op.create_table(
        "cv_access_logs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("requested_by_user_id", sa.String(), nullable=False),
        sa.Column("registration_id", sa.String(), nullable=False),
        sa.Column("accessed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_cv_access_logs_user", "cv_access_logs", ["requested_by_user_id"])
    op.create_index("ix_cv_access_logs_reg", "cv_access_logs", ["registration_id"])


def downgrade() -> None:
    op.drop_table("cv_access_logs")
    op.drop_table("registrations")
    op.drop_table("workshops")
    op.drop_table("schedule_items")
    op.drop_table("users")
