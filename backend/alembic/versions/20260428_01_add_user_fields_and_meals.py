"""add edad sexo to users and create meals table

Revision ID: 20260428_01
Revises:
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260428_01"
down_revision = None
branch_labels = None
depends_on = None


def _has_column(inspector, table_name: str, column_name: str) -> bool:
    return any(c["name"] == column_name for c in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "users" in inspector.get_table_names():
        if not _has_column(inspector, "users", "edad"):
            op.add_column("users", sa.Column("edad", sa.Integer(), nullable=True))
        if not _has_column(inspector, "users", "sexo"):
            op.add_column("users", sa.Column("sexo", sa.String(), nullable=True))

    if "meals" not in inspector.get_table_names():
        op.create_table(
            "meals",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("fecha", sa.Date(), nullable=False),
            sa.Column("nombre", sa.String(), nullable=False),
            sa.Column("descripcion", sa.String(), nullable=True),
            sa.Column("hora", sa.Time(), nullable=True),
            sa.Column("status", sa.String(), nullable=False, server_default="completed"),
            sa.Column("proteina_g", sa.Float(), nullable=True),
            sa.Column("carbos_g", sa.Float(), nullable=True),
            sa.Column("grasas_g", sa.Float(), nullable=True),
            sa.Column("kcal", sa.Float(), nullable=True),
            sa.Column("ai_suggested", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "meals" in inspector.get_table_names():
        op.drop_table("meals")

    if "users" in inspector.get_table_names():
        if _has_column(inspector, "users", "sexo"):
            op.drop_column("users", "sexo")
        if _has_column(inspector, "users", "edad"):
            op.drop_column("users", "edad")
