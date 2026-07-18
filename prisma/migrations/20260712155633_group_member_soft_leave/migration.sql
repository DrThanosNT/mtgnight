/*
  Warnings:

  - The `format` column on the `Deck` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `format` on the `Game` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `format` to the `Group` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerCount` to the `Group` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Format" AS ENUM ('STANDARD', 'PIONEER', 'MODERN', 'LEGACY', 'VINTAGE', 'PAUPER', 'COMMANDER', 'DUEL_COMMANDER', 'OATHBREAKER', 'BRAWL', 'HISTORIC_BRAWL', 'HISTORIC', 'EXPLORER', 'TIMELESS', 'ALCHEMY', 'FRONTIER', 'GLADIATOR', 'CANADIAN_HIGHLANDER', 'AUSTRALIAN_HIGHLANDER', 'TINY_LEADERS', 'ARTISAN', 'PENNY_DREADFUL', 'PREMODERN', 'ALPHA_40', 'BOOSTER_DRAFT', 'SEALED', 'CUBE', 'JUMPSTART', 'PACK_WARS', 'PLANECHASE', 'ARCHENEMY', 'ARCHENEMY_COMMANDER', 'TWO_HEADED_GIANT', 'CONSPIRACY', 'FREEFORM', 'MOMIR_BASIC');

-- AlterTable
ALTER TABLE "Deck" ADD COLUMN     "formatRaw" TEXT,
DROP COLUMN "format",
ADD COLUMN     "format" "Format";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "format",
ADD COLUMN     "format" "Format" NOT NULL,
ALTER COLUMN "startingLife" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "format" "Format" NOT NULL,
ADD COLUMN     "playerCount" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "leftAt" TIMESTAMP(3);
