-- CreateTable: message_logs
-- Added via prisma db push and recorded here for production deployment.

CREATE TABLE IF NOT EXISTS "message_logs" (
  "id" SERIAL NOT NULL,
  "business_id" TEXT NOT NULL,
  "sent_by" INTEGER NOT NULL,
  "channels" TEXT[] NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'transactional',
  "message" TEXT NOT NULL,
  "subject" TEXT,
  "recipient_count" INTEGER NOT NULL DEFAULT 0,
  "sent_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "skipped_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_sent_by_fkey"
  FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
