-- SQL Script to Update User to Admin Role
-- Usage: Run this in your MySQL database

-- Option 1: Update by email
UPDATE user SET roles = 'admin' WHERE email = 'admin@example.com';

-- Option 2: Update by user ID (if you know the ID)
-- UPDATE user SET roles = 'admin' WHERE id = 'user-id-here';

-- Option 3: Update multiple users
-- UPDATE user SET roles = 'admin' WHERE email IN ('admin1@example.com', 'admin2@example.com');

-- Verify the update
SELECT id, email, userName, roles, isblocked FROM user WHERE roles = 'admin';

