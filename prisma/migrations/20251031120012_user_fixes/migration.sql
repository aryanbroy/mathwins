/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `desciption` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionDescription" AS ENUM ('SINGLE_PLAYER', 'DAILY_TROURNAMET', 'INSTANT_TROURNAMET', 'REFERAL_POINT', 'REWARD_CLAIM');

-- DropIndex
DROP INDEX "public"."User_name_key";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "desciption",
ADD COLUMN     "desciption" "TransactionDescription" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "username" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "googleId" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

-- DropEnum
DROP TYPE "public"."TransactionDesciption";

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
