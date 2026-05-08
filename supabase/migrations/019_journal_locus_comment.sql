-- Add Locus AI comment column to journal entries
alter table journal_entries add column if not exists locus_comment text;
