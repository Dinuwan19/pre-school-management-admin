-- AlterTable
ALTER TABLE `attendance` ADD COLUMN `deviceId` VARCHAR(191) NULL,
    ADD COLUMN `method` ENUM('QR', 'MANUAL', 'SYSTEM') NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'COMPLETED') NOT NULL DEFAULT 'PRESENT';

-- CreateTable
CREATE TABLE `attendanceaudit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attendanceId` INTEGER NOT NULL,
    `changedById` INTEGER NOT NULL,
    `oldData` TEXT NOT NULL,
    `newData` TEXT NOT NULL,
    `reason` TEXT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttendanceAudit_attendanceId_fkey`(`attendanceId`),
    INDEX `AttendanceAudit_changedById_fkey`(`changedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendanceaudit` ADD CONSTRAINT `attendanceaudit_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `attendance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendanceaudit` ADD CONSTRAINT `attendanceaudit_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
