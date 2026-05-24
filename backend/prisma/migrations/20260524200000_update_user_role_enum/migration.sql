-- Step 1: Add new role values to the ENUM
ALTER TABLE `users` MODIFY `role` ENUM('reporter', 'investigator', 'manager', 'admin', 'owner', 'senior') NOT NULL DEFAULT 'senior';

-- Step 2: Migrate existing roles to new values
UPDATE `users` SET `role` = 'owner' WHERE `role` = 'admin';
UPDATE `users` SET `role` = 'senior' WHERE `role` = 'reporter';
UPDATE `users` SET `role` = 'senior' WHERE `role` = 'investigator';
-- manager stays as manager

-- Step 3: Remove old role values from the ENUM
ALTER TABLE `users` MODIFY `role` ENUM('owner', 'manager', 'senior') NOT NULL DEFAULT 'senior';

-- Step 4: Drop the department column
ALTER TABLE `users` DROP COLUMN `department`;
