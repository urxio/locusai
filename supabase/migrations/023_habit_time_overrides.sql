-- Per-date time overrides for habits.
-- When a user right-clicks a habit on a specific day and chooses "this day only",
-- an override row is inserted here. The planner reads these to determine the
-- effective time for each habit+date combination.

CREATE TABLE IF NOT EXISTS habit_time_overrides (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id    UUID        NOT NULL REFERENCES habits(id)     ON DELETE CASCADE,
  date        DATE        NOT NULL,
  time_of_day TEXT,       -- HH:MM, or NULL = no specific time for this date
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, date)
);

ALTER TABLE habit_time_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own habit time overrides"
  ON habit_time_overrides FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS habit_time_overrides_user_date
  ON habit_time_overrides (user_id, date);
