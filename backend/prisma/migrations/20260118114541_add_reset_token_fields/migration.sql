-- AlterTable
ALTER TABLE `expense` ADD COLUMN `receiptUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `teacherprofile` ADD COLUMN `designation` ENUM('LEAD', 'ASSISTANT') NOT NULL DEFAULT 'ASSISTANT';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `resetToken` VARCHAR(191) NULL,
    ADD COLUMN `resetTokenExpires` DATETIME(3) NULL;
