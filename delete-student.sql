-- Delete student with ID 1 and related records
-- This file is for manual database cleanup

DELETE FROM phone_status WHERE student_id = 1;
DELETE FROM special_pass_grants WHERE student_id = 1;
DELETE FROM students WHERE id = 1;

-- Verify deletion
SELECT COUNT(*) as remaining_students FROM students;
