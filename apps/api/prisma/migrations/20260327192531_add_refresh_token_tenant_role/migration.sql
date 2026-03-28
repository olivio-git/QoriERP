/*
  Warnings:

  - Added the required column `role` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "tenant_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "refresh_tokens_tenant_id_idx" ON "refresh_tokens"("tenant_id");
