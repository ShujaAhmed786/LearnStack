-- AlterEnum
ALTER TYPE "GuideCategory" ADD VALUE 'SCALABILITY';

-- AlterTable
ALTER TABLE "Tactic" ADD COLUMN     "howToImplement" TEXT,
ADD COLUMN     "howToUse" TEXT,
ADD COLUMN     "whenUseful" TEXT;
