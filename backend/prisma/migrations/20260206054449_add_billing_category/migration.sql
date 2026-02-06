/*
  Warnings:

  - You are about to drop the column `assignedClassroomId` on the `teacherprofile` table. All the data in the column will be lost.
  - You are about to drop the `progress_report` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `progress_score` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subject` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[verificationCode]` on the table `parent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[receiptNo]` on the table `payment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `progress_report` DROP FOREIGN KEY `progress_report_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `progress_report` DROP FOREIGN KEY `progress_report_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `progress_score` DROP FOREIGN KEY `progress_score_reportId_fkey`;

-- DropForeignKey
ALTER TABLE `progress_score` DROP FOREIGN KEY `progress_score_subjectId_fkey`;

-- DropForeignKey
ALTER TABLE `teacherprofile` DROP FOREIGN KEY `TeacherProfile_assignedClassroomId_fkey`;

-- AlterTable
ALTER TABLE `billing` ADD COLUMN `categoryId` INTEGER NULL,
    ADD COLUMN `invoiceUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `event` ADD COLUMN `mediaUrl` VARCHAR(191) NULL,
    MODIFY `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'PUBLISHED', 'UPCOMING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING';

-- AlterTable
ALTER TABLE `parent` ADD COLUMN `avatarType` ENUM('ADULT', 'CHILD') NOT NULL DEFAULT 'ADULT',
    ADD COLUMN `verificationCode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `invoiceUrl` VARCHAR(191) NULL,
    ADD COLUMN `receiptNo` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `student` ADD COLUMN `avatarType` ENUM('ADULT', 'CHILD') NOT NULL DEFAULT 'CHILD',
    ADD COLUMN `vaccineCardPdf` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `teacherprofile` DROP COLUMN `assignedClassroomId`;

-- DropTable
DROP TABLE `progress_report`;

-- DropTable
DROP TABLE `progress_score`;

-- DropTable
DROP TABLE `subject`;

-- CreateTable
CREATE TABLE `BillingCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `validUntil` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studentprogress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `reading` INTEGER NULL,
    `writing` INTEGER NULL,
    `speaking` INTEGER NULL,
    `listening` INTEGER NULL,
    `mathematics` INTEGER NULL,
    `social` INTEGER NULL,
    `remarks` TEXT NULL,
    `updatedById` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudentProgress_studentId_fkey`(`studentId`),
    INDEX `StudentProgress_updatedById_fkey`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL DEFAULT 'IMAGE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventMedia_eventId_fkey`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `skill_category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `skill_category_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sub_skill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoryId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    INDEX `SubSkill_categoryId_fkey`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `term` INTEGER NOT NULL,
    `remarks` TEXT NULL,
    `updatedById` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Assessment_studentId_fkey`(`studentId`),
    INDEX `Assessment_updatedById_fkey`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_score` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assessmentId` INTEGER NOT NULL,
    `subSkillId` INTEGER NOT NULL,
    `score` INTEGER NOT NULL,

    INDEX `AssessmentScore_assessmentId_fkey`(`assessmentId`),
    INDEX `AssessmentScore_subSkillId_fkey`(`subSkillId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_BillingCategoryToclassroom` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_BillingCategoryToclassroom_AB_unique`(`A`, `B`),
    INDEX `_BillingCategoryToclassroom_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_classroomToteacherprofile` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_classroomToteacherprofile_AB_unique`(`A`, `B`),
    INDEX `_classroomToteacherprofile_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_classroomToevent` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_classroomToevent_AB_unique`(`A`, `B`),
    INDEX `_classroomToevent_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Billing_categoryId_fkey` ON `billing`(`categoryId`);

-- CreateIndex
CREATE INDEX `meeting_request_studentId_fkey` ON `meeting_request`(`studentId`);

-- CreateIndex
CREATE UNIQUE INDEX `parent_verificationCode_key` ON `parent`(`verificationCode`);

-- CreateIndex
CREATE UNIQUE INDEX `payment_receiptNo_key` ON `payment`(`receiptNo`);

-- AddForeignKey
ALTER TABLE `billing` ADD CONSTRAINT `billing_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `BillingCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentprogress` ADD CONSTRAINT `StudentProgress_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentprogress` ADD CONSTRAINT `StudentProgress_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meeting_request` ADD CONSTRAINT `meeting_request_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_media` ADD CONSTRAINT `event_media_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_skill` ADD CONSTRAINT `sub_skill_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `skill_category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment` ADD CONSTRAINT `assessment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment` ADD CONSTRAINT `assessment_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_score` ADD CONSTRAINT `assessment_score_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_score` ADD CONSTRAINT `assessment_score_subSkillId_fkey` FOREIGN KEY (`subSkillId`) REFERENCES `sub_skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BillingCategoryToclassroom` ADD CONSTRAINT `_BillingCategoryToclassroom_A_fkey` FOREIGN KEY (`A`) REFERENCES `BillingCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BillingCategoryToclassroom` ADD CONSTRAINT `_BillingCategoryToclassroom_B_fkey` FOREIGN KEY (`B`) REFERENCES `classroom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_classroomToteacherprofile` ADD CONSTRAINT `_classroomToteacherprofile_A_fkey` FOREIGN KEY (`A`) REFERENCES `classroom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_classroomToteacherprofile` ADD CONSTRAINT `_classroomToteacherprofile_B_fkey` FOREIGN KEY (`B`) REFERENCES `teacherprofile`(`teacherId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_classroomToevent` ADD CONSTRAINT `_classroomToevent_A_fkey` FOREIGN KEY (`A`) REFERENCES `classroom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_classroomToevent` ADD CONSTRAINT `_classroomToevent_B_fkey` FOREIGN KEY (`B`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
