🗄️ Phase 1: Database Preparation (Prisma)
[ ] 1. Create the Business model in schema.prisma.

[ ] 2. Add businessId String? (make it optional for now) to every other model (User, Sale, Material, Invoice, etc.).

[ ] 3. Define the relation to the Business model on all those tables.

[ ] 4. Run the first migration: npx prisma migrate dev --name prepare_multi_tenancy

🚚 Phase 2: Zero-Data-Loss Migration (Existing Client)
[ ] 1. Create a standalone Node.js script (migrate-tenant.js).

[ ] 2. In the script: Create the first Business record for your existing client.

[ ] 3. In the script: Update all existing users to have this new businessId.

[ ] 4. In the script: Update all existing records (Sales, Materials, etc.) to have this businessId.

[ ] 5. Run the script on your local/production database.

[ ] 6. Go back to schema.prisma and remove the ? from businessId (making it required).

[ ] 7. Run the second migration: npx prisma migrate dev --name enforce_business_id

🔒 Phase 3: Backend Security & Data Isolation
[ ] 1. Update Auth Controller: Ensure login/register assigns and returns the businessId in the JWT token.

[ ] 2. Update Auth Middleware: Ensure req.user includes the businessId for all protected routes.

[ ] 3. The Big Refactor: Go through EVERY controller file and update findMany, findFirst, update, and delete queries to include where: { businessId: req.user.businessId }.

[ ] 4. Update all create queries to attach businessId: req.user.businessId to the new records.

🌐 Phase 4: Frontend Updates (New User Onboarding)
[ ] 1. Update the Frontend Registration Page to ask for "Business/Company Name".

[ ] 2. Update the Backend Registration Route to use a Prisma $transaction (Create the Business, then create the Admin User attached to it).

[ ] 3. Ensure the frontend Auth store saves the businessId on login.

🚀 Phase 5: SaaS Plans & Limits (Optional/Next Steps)
[ ] 1. Add plan field to the Business model (e.g., 'free', 'basic', 'pro').

[ ] 2. Create middleware to check usage limits based on the assigned plan (e.g., max 50 materials for free plan).