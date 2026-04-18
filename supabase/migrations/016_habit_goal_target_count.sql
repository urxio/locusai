-- Move target-completion count from goals → habits (per-habit granularity).
-- Each habit linked to a habit-tracked goal can now carry its own target.

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS goal_target_count INTEGER
    CHECK (goal_target_count IS NULL OR goal_target_count > 0);

-- habit_target_count on goals is superseded by the per-habit column above.
ALTER TABLE goals DROP COLUMN IF EXISTS habit_target_count;
