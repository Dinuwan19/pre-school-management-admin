/*
  Warnings:

  - You are about to drop the column `billingId` on the `payment` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Billing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountPaid` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `Payment_billingId_fkey`;

-- AlterTable
ALTER TABLE `billing` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `notification` ADD COLUMN `billingMonth` VARCHAR(191) NULL,
    ADD COLUMN `targetParentId` INTEGER NULL;

-- AlterTable
ALTER TABLE `payment` DROP COLUMN `billingId`,
    ADD COLUMN `amountPaid` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `transactionRef` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `BillingPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `billingId` INTEGER NOT NULL,
    `paymentId` INTEGER NOT NULL,

    UNIQUE INDEX `BillingPayment_billingId_paymentId_key`(`billingId`, `paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_targetParentId_fkey` FOREIGN KEY (`targetParentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillingPayment` ADD CONSTRAINT `BillingPayment_billingId_fkey` FOREIGN KEY (`billingId`) REFERENCES `Billing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillingPayment` ADD CONSTRAINT `BillingPayment_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
