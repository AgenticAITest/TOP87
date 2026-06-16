-- Migrate any existing 'most_likely' values to 'undecided'
UPDATE profiles SET reunion_attendance = 'undecided' WHERE reunion_attendance = 'most_likely';

-- Drop the old check constraint and recreate with only 3 values
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_reunion_attendance_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_reunion_attendance_check
  CHECK (reunion_attendance IN ('yes', 'undecided', 'no'));
