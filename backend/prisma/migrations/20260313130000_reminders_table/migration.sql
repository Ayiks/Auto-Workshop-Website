-- CreateTable: reminders
CREATE TABLE "reminders" (
  "id"             SERIAL PRIMARY KEY,
  "business_id"    TEXT NOT NULL REFERENCES "businesses"("id"),
  "customer_id"    INTEGER NOT NULL REFERENCES "customers"("id"),
  "job_id"         INTEGER REFERENCES "jobs"("id") ON DELETE SET NULL,
  "type"           VARCHAR(30) NOT NULL,
  "channel"        VARCHAR(20) NOT NULL DEFAULT 'email',
  "status"         VARCHAR(20) NOT NULL DEFAULT 'pending',
  "scheduled_for"  TIMESTAMP(3) NOT NULL,
  "sent_at"        TIMESTAMP(3),
  "message"        TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "reminders_business_id_status_idx" ON "reminders"("business_id", "status");
CREATE INDEX "reminders_scheduled_for_idx" ON "reminders"("scheduled_for");
CREATE INDEX "reminders_customer_id_idx" ON "reminders"("customer_id");
