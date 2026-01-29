-- Add special_pass column to students table with default value 'NO'
ALTER TABLE students ADD COLUMN IF NOT EXISTS special_pass TEXT DEFAULT 'NO';
