-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'sales', 'mechanic');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'in_progress', 'completed', 'invoiced');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('new', 'contacted', 'scheduled', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "full_name" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "selling_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_level" INTEGER NOT NULL DEFAULT 10,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "total_profit" DECIMAL(10,2) NOT NULL,
    "sold_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "profit" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" SERIAL NOT NULL,
    "client_name" VARCHAR(100) NOT NULL,
    "client_phone" VARCHAR(20),
    "client_email" VARCHAR(100),
    "car_make" VARCHAR(50),
    "car_model" VARCHAR(50),
    "car_reg_number" VARCHAR(20),
    "problem_description" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "mechanic_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_materials" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "material_name" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimated_cost" DECIMAL(10,2),
    "is_purchased" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "job_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "materials_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "labour_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "notes" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "client_name" VARCHAR(100) NOT NULL,
    "client_email" VARCHAR(100),
    "client_phone" VARCHAR(20) NOT NULL,
    "service_type" VARCHAR(100),
    "preferred_date" DATE,
    "message" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_job_id_key" ON "invoices"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_sold_by_fkey" FOREIGN KEY ("sold_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_materials" ADD CONSTRAINT "job_materials_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
