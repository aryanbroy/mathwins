-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "soloAttemptId" INTEGER;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_soloAttemptId_fkey" FOREIGN KEY ("soloAttemptId") REFERENCES "SoloAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
