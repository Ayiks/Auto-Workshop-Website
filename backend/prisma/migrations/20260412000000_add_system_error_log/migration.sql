CREATE TABLE IF NOT EXISTS "public"."system_error_logs" (
    "id"          SERIAL       NOT NULL,
    "message"     TEXT         NOT NULL,
    "stack"       TEXT,
    "endpoint"    VARCHAR(255),
    "method"      VARCHAR(10),
    "status_code" INTEGER,
    "user_id"     INTEGER,
    "business_id" TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved"    BOOLEAN      NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" INTEGER,

    CONSTRAINT "system_error_logs_pkey" PRIMARY KEY ("id")
);
