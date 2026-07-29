-- AlterTable: align Session with schema (group for attendance / schedule filtering)
ALTER TABLE "Session" ADD COLUMN "groupId" TEXT;

-- AddForeignKey (optional group — SET NULL if group removed)
ALTER TABLE "Session" ADD CONSTRAINT "Session_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
