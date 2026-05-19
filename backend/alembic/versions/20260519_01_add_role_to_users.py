"""add role to users

Revision ID: 20260519_01
Revises: 20260505_01
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa


revision = "20260519_01"
down_revision = "20260505_01"
branch_labels = None
depends_on = None


def _has_column(inspector, table_name: str, column_name: str) -> bool:
    return any(c["name"] == column_name for c in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" in inspector.get_table_names() and not _has_column(inspector, "users", "role"):
        op.add_column(
            "users",
            sa.Column("role", sa.String(), nullable=False, server_default="user"),
        )
        op.create_check_constraint(
            "ck_users_role_valid",
            "users",
            "role IN ('user', 'trainer')",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" in inspector.get_table_names() and _has_column(inspector, "users", "role"):
        op.drop_constraint("ck_users_role_valid", "users", type_="check")
        op.drop_column("users", "role")
