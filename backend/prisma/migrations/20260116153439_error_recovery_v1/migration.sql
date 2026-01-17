/*
  Warnings:

  - You are about to drop the column `schedule` on the `classroom` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[verificationCode]` on the table `parent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `classroom` DROP COLUMN `schedule`,
    ADD COLUMN `mealPlan` TEXT NULL;

-- AlterTable
ALTER TABLE `parent` ADD COLUMN `verificationCode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `parent_verificationCode_key` ON `parent`(`verificationCode`);
