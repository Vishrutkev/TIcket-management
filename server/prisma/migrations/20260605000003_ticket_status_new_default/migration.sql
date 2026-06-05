-- AlterTable: change default status from 'open' to 'new'
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'new';
