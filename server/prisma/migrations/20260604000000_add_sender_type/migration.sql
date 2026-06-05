-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('customer', 'agent');

-- AlterTable: add nullable first so we can back-fill from isFromCustomer
ALTER TABLE "Message" ADD COLUMN "senderType" "SenderType";

-- Back-fill existing rows from isFromCustomer
UPDATE "Message"
SET "senderType" = CASE
  WHEN "isFromCustomer" = true THEN 'customer'::"SenderType"
  ELSE 'agent'::"SenderType"
END;

-- Make the column required with a sensible default for future rows
ALTER TABLE "Message" ALTER COLUMN "senderType" SET NOT NULL;
ALTER TABLE "Message" ALTER COLUMN "senderType" SET DEFAULT 'customer';

-- Drop the old boolean column
ALTER TABLE "Message" DROP COLUMN "isFromCustomer";
