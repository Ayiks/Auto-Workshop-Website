import { PrismaClient } from '@prisma/client';

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await basePrisma.$disconnect();
});

// ==========================================================================
// THE MULTI-TENANT ENGINE (The Bulletproof Walls)
// ==========================================================================
const tenantClients = {}; // Cache for tenant-specific Prisma clients

export const getTenantDB = (businessId) => {
  if (!businessId) {
    throw new Error("CRITICAL: Attempted to access database without a businessId.");
  }

  // If we already built the engine for this business, reuse it!
  if (tenantClients[businessId]) {
    return tenantClients[businessId];
  }

  const tenantClient = basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // 1. List the models that belong to a specific business.
          // Note: Ensure these match the exact casing in your schema.prisma!
          const tenantModels = [
            'User', 'Customer', 'Material', 'MaterialUnit', 'MaterialReorder', 'GlobalUnit',
            'Service', 'Sale', 'SaleItem', 'Job', 'JobMaterial', 'Invoice',
            'Payment', 'Receipt', 'Expense', 'Booking', 'BusinessSettings', 'AuditLog'
          ];

          // 2. If the model is tenant-specific, intercept the query
          if (tenantModels.includes(model)) {
            
            // Auto-inject businessId into all READ, UPDATE, and DELETE queries
            const readWriteOps = ['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'];
            if (readWriteOps.includes(operation)) {
              args.where = { ...args.where, businessId };
            }

            // Auto-inject businessId into all CREATE queries
            if (operation === 'create') {
              args.data = { ...args.data, businessId };
            }
            if (operation === 'createMany') {
              args.data = Array.isArray(args.data) 
                ? args.data.map(item => ({ ...item, businessId }))
                : { ...args.data, businessId };
            }
          }

          // 3. Execute the modified query
          return query(args);
        },
      },
    },
  });

  tenantClients[businessId] = tenantClient;
  return tenantClient;
};

// We still export the base Prisma for login/global operations
export default basePrisma;