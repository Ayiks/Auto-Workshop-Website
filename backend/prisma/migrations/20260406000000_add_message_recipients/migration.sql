-- Add per-recipient delivery tracking table
CREATE TABLE IF NOT EXISTS "message_recipients" (
  "id"            SERIAL PRIMARY KEY,
  "log_id"        INTEGER NOT NULL,
  "business_id"   VARCHAR NOT NULL,
  "customer_id"   INTEGER,
  "customer_name" VARCHAR NOT NULL,
  "phone"         VARCHAR,
  "email"         VARCHAR,
  "channel"       VARCHAR NOT NULL,
  "status"        VARCHAR NOT NULL DEFAULT 'pending',
  "reason"        TEXT,
  "delivered_at"  TIMESTAMP,
  "created_at"    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_recipients_log_id_fkey"
    FOREIGN KEY ("log_id") REFERENCES "message_logs"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "message_recipients_log_id_idx"
  ON "message_recipients"("log_id");

CREATE INDEX IF NOT EXISTS "message_recipients_phone_channel_status_idx"
  ON "message_recipients"("phone", "channel", "status");
