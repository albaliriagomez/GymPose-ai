"""add training exercise progress

Revision ID: 20260519_03
Revises: 20260519_02
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260519_03"
down_revision = "20260519_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "training_exercise_progress",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("training_plan_id", sa.Integer(), sa.ForeignKey("training_plan_selections.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("training_routine_id", sa.Integer(), sa.ForeignKey("training_routine_progress.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("day_number", sa.Integer(), nullable=False),
        sa.Column("exercise_order", sa.Integer(), nullable=False),
        sa.Column("exercise_name", sa.String(), nullable=False),
        sa.Column("sets_target", sa.Integer(), nullable=False),
        sa.Column("reps_target", sa.String(), nullable=False),
        sa.Column("reps_target_value", sa.Integer(), nullable=True),
        sa.Column("sets_completed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("reps_completed_current_set", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("training_routine_id", "exercise_order", name="uq_training_routine_exercise_order"),
    )


def downgrade() -> None:
    op.drop_table("training_exercise_progress")
