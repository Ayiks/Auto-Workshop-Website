-- Create sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1000;

-- Add a column to store the sequence ID
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS seq_id BIGINT DEFAULT nextval('receipt_number_seq');

-- Create unique index on seq_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_seq_id ON "receipts"(seq_id);
