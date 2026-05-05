"""add nivel_actividad preferencia_alimentaria alergias to users

Revision ID: 20260505_01
Revises: 20260428_01
Create Date: 2026-05-05
"""

from alembic import op
import sqlalchemy as sa


revision = "20260505_01"
down_revision = "20260428_01"
branch_labels = None
depends_on = None


def _has_column(inspector, table_name: str, column_name: str) -> bool:
    return any(c["name"] == column_name for c in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" in inspector.get_table_names():
        if not _has_column(inspector, "users", "nivel_actividad"):
            op.add_column("users", sa.Column("nivel_actividad", sa.String(), nullable=True))
        if not _has_column(inspector, "users", "preferencia_alimentaria"):
            op.add_column("users", sa.Column("preferencia_alimentaria", sa.String(), nullable=True))
        if not _has_column(inspector, "users", "alergias"):
            op.add_column("users", sa.Column("alergias", sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" in inspector.get_table_names():
        if _has_column(inspector, "users", "alergias"):
            op.drop_column("users", "alergias")
        if _has_column(inspector, "users", "preferencia_alimentaria"):
            op.drop_column("users", "preferencia_alimentaria")
        if _has_column(inspector, "users", "nivel_actividad"):
            op.drop_column("users", "nivel_actividad")
