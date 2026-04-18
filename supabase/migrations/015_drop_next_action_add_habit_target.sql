-- Remove next_action from goals (replaced by AI-generated steps)
-- Add habit_target_count for count-based habit-tracked goals
--   e.g. "Run 30 times" → progress = completions / 30 × 100
--   When NULL, progress uses scheduled-days formula instead.

ALTER TABLE goals DROP COLUMN IF EXISTS next_action;

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS habit_target_count INTEGER
    CHECK (habit_target_count IS NULL OR habit_target_count > 0);
