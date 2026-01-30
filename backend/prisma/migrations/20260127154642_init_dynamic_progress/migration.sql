/*
  Warnings:

  - You are about to drop the column `verificationCode` on the `parent` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `progress_report` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `subject` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `subject` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `subject` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `subject` table. All the data in the column will be lost.
  - You are about to drop the `studentprogress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `progress_score` DROP FOREIGN KEY `progress_score_reportId_fkey`;

-- DropForeignKey
ALTER TABLE `studentprogress` DROP FOREIGN KEY `StudentProgress_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `studentprogress` DROP FOREIGN KEY `StudentProgress_updatedById_fkey`;

-- DropIndex
DROP INDEX `parent_verificationCode_key` ON `parent`;

-- AlterTable
ALTER TABLE `parent` DROP COLUMN `verificationCode`;

-- AlterTable
ALTER TABLE `progress_report` DROP COLUMN `updatedAt`,
    MODIFY `reportDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `subject` DROP COLUMN `code`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `description`,
    DROP COLUMN `updatedAt`;

-- DropTable
DROP TABLE `studentprogress`;

-- AddForeignKey
ALTER TABLE `progress_score` ADD CONSTRAINT `progress_score_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `progress_report`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
