-- CreateTable: super_admins
CREATE TABLE IF NOT EXISTS "public"."super_admins" (
    "id"           SERIAL        NOT NULL,
    "email"        VARCHAR(100)  NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name"    VARCHAR(100)  NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login"   TIMESTAMP(3),
    "is_active"    BOOLEAN       NOT NULL DEFAULT true,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "super_admins_email_key" ON "public"."super_admins"("email");

-- CreateTable: feature_flags
CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "id"                  SERIAL        NOT NULL,
    "key"                 VARCHAR(100)  NOT NULL,
    "name"                VARCHAR(100)  NOT NULL,
    "description"         TEXT,
    "is_globally_enabled" BOOLEAN       NOT NULL DEFAULT false,
    "enabled_business_ids" TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_key_key" ON "public"."feature_flags"("key");

-- CreateTable: admin_audit_logs
CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id"             SERIAL        NOT NULL,
    "super_admin_id" INTEGER       NOT NULL,
    "action"         VARCHAR(100)  NOT NULL,
    "target_type"    VARCHAR(50),
    "target_id"      VARCHAR(100),
    "description"    TEXT          NOT NULL,
    "raw_sql"        TEXT,
    "ip_address"     VARCHAR(50),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);
