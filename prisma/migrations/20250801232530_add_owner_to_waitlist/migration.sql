/*
  Warnings:

  - Added the required column `ownerUsername` to the `Waitlist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Waitlist" ADD COLUMN     "ownerUsername" TEXT NOT NULL;
