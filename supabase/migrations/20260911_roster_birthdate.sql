-- Adds the birthdate column to the alumni master roster.
--
-- The committee's master spreadsheet ('DATA TOP87 MASTER updated Bday.xlsm') now carries a
-- birthdate for all 276 alumni across 3A-3F — including the ~141 who have not registered an
-- account and therefore have no profiles row. alumni_roster is the right home for it: it is the
-- true denominator for "who exists", and it keeps the data for unregistered alumni somewhere
-- other than a spreadsheet.
--
-- profiles.birthdate stays the member-facing field (self-editable in /register and /profile);
-- this column is the committee's record, and the companion data script syncs roster -> profiles
-- for linked accounts.
--
-- Committee-internal, so it inherits the existing super-admin-only RLS policy on the table.
--
-- Run this FIRST, then working_files/roster_birthdate_update.sql to populate it.

ALTER TABLE alumni_roster
  ADD COLUMN IF NOT EXISTS birthdate date;

COMMENT ON COLUMN alumni_roster.birthdate IS
  'Date of birth from the committee master roster. Source of truth for alumni without an account; synced into profiles.birthdate for linked accounts.';
