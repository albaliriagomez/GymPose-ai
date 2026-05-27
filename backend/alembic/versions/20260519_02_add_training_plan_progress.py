"""add training plan selection and routine progress

Revision ID: 20260519_02
Revises: 20260519_01
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260519_02"
down_revision = "20260519_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "training_plan_selections",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True, index=True),
        sa.Column("plan_variant", sa.String(), nullable=False),
        sa.Column("frequency", sa.String(), nullable=False, server_default=sa.text("'media'")),
        sa.Column("goal", sa.String(), nullable=True),
        sa.Column("plan_payload", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("selected_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "training_routine_progress",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("training_plan_id", sa.Integer(), sa.ForeignKey("training_plan_selections.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("day_number", sa.Integer(), nullable=False),
        sa.Column("day_name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("completed_exercises_count", sa.Integer(), nullable=True),
        sa.Column("total_exercises", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("training_plan_id", "day_number", name="uq_training_plan_day_number"),
    )


def downgrade() -> None:
    op.drop_table("training_routine_progress")
    op.drop_table("training_plan_selections")
