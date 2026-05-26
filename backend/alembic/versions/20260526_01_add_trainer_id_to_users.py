"""add trainer_id to users

Revision ID: 20260526_01
Revises: 20260519_01
Create Date: 2026-05-26
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260526_01"
down_revision = "20260519_01"
branch_labels = None
depends_on = None


def _has_column(inspector, table_name: str, column_name: str) -> bool:
    return any(c["name"] == column_name for c in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" in inspector.get_table_names() and not _has_column(inspector, "users", "trainer_id"):
        op.add_column(
            "users",
            sa.Column("trainer_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(
            "fk_users_trainer_id_users",
            "users",
            "users",
            ["trainer_id"],
            ["id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" in inspector.get_table_names() and _has_column(inspector, "users", "trainer_id"):
        op.drop_constraint("fk_users_trainer_id_users", "users", type_="foreignkey")
        op.drop_column("users", "trainer_id")
