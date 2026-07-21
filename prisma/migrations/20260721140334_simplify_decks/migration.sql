/*
  Warnings:

  - You are about to drop the column `cardCount` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `colorIdentity` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `commanders` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `formatRaw` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `importedAt` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `moxfieldId` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `moxfieldUrl` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `rawData` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Deck` table. All the data in the column will be lost.
  - Made the column `format` on table `Deck` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Deck" DROP COLUMN "cardCount",
DROP COLUMN "colorIdentity",
DROP COLUMN "commanders",
DROP COLUMN "formatRaw",
DROP COLUMN "importedAt",
DROP COLUMN "moxfieldId",
DROP COLUMN "moxfieldUrl",
DROP COLUMN "rawData",
DROP COLUMN "updatedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "format" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Deck_ownerId_format_idx" ON "Deck"("ownerId", "format");
