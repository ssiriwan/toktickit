-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "TicketStatus" ADD VALUE 'ON_HOLD';
ALTER TYPE "TicketStatus" ADD VALUE 'PENDING_FOR_APPROVAL';
ALTER TYPE "TicketStatus" ADD VALUE 'MONITORING';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" SET DEFAULT 'OPEN';
