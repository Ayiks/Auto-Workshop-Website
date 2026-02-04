import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// Helper function to get date range (default: current month)
const getDateRange = (startDate, endDate) => {
  const range = {};
  
  if (startDate || endDate) {
    if (startDate) {
      range.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
  } else {
    // Default to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    range.gte = firstDay;
    range.lte = lastDay;
  }
  
  return range;
};

// @desc    Get Sales Report
// @route   GET /api/reports/sales
// @access  Private (requires 'reports:view' permission)
export const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, paymentMethod, itemType } = req.query;
  const dateRange = getDateRange(startDate, endDate);

  const salesWhere = {
    status: 'completed',
    saleDate: dateRange,
  };

  if (paymentMethod) {
    salesWhere.paymentMethod = paymentMethod;
  }

  // Get all sales with items
  const sales = await prisma.sale.findMany({
    where: salesWhere,
    include: {
      items: {
        include: {
          material: {
            select: { name: true },
          },
          service: {
            select: { type: true },
          },
        },
      },
      user: {
        select: { fullName: true },
      },
    },
    orderBy: { saleDate: 'desc' },
  });

  // Calculate breakdown
  let materialSales = 0;
  let boothSales = 0;
  const materialItems = [];
  const boothItems = [];

  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (item.itemType === 'material') {
        materialSales += parseFloat(item.subtotal);
        materialItems.push({
          saleId: sale.id,
          saleDate: sale.saleDate,
          materialName: item.materialName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        });
      } else if (item.itemType === 'booth') {
        boothSales += parseFloat(item.subtotal);
        boothItems.push({
          saleId: sale.id,
          saleDate: sale.saleDate,
          price: item.unitPrice,
        });
      }
    });
  });

  const totalSalesRevenue = materialSales + boothSales;

  // Sales by payment method
  const salesByMethod = await prisma.sale.groupBy({
    by: ['paymentMethod'],
    where: salesWhere,
    _sum: { totalAmount: true },
    _count: true,
  });

  // Daily sales trend
  let dailySales = [];
  try {
    dailySales = await prisma.$queryRaw`
      SELECT 
        DATE(sale_date)::TEXT as date,
        COUNT(*)::INTEGER as count,
        SUM(total_amount)::DECIMAL as total
      FROM sales
      WHERE status = 'completed'
        AND sale_date >= ${dateRange.gte}
        AND sale_date <= ${dateRange.lte}
      GROUP BY DATE(sale_date)
      ORDER BY date ASC
    `;
  } catch (error) {
    console.error('Daily sales query error:', error);
    dailySales = [];
  }

  res.status(200).json({
    success: true,
    period: {
      startDate: dateRange.gte,
      endDate: dateRange.lte,
    },
    data: {
      summary: {
        totalSalesRevenue,
        materialSales,
        boothSales,
        totalTransactions: sales.length,
      },
      breakdown: {
        materials: {
          revenue: materialSales,
          count: materialItems.length,
          items: materialItems,
        },
        booth: {
          revenue: boothSales,
          count: boothItems.length,
          items: boothItems,
        },
      },
      salesByMethod,
      dailyTrend: dailySales,
      recentSales: sales.slice(0, 10),
    },
  });
});

// @desc    Get Job Report
// @route   GET /api/reports/jobs
// @access  Private (requires 'reports:view' permission)
export const getJobReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, jobType, status } = req.query;
  const dateRange = getDateRange(startDate, endDate);

  // Get invoices (which represent completed/paid jobs)
  const invoiceWhere = {
    invoiceDate: dateRange,
  };

  if (jobType) {
    invoiceWhere.job = { jobType };
  }

  const invoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    include: {
      job: {
        include: {
          materials: true,
          user: {
            select: { fullName: true },
          },
        },
      },
      payments: {
        select: {
          amount: true,
          paymentDate: true,
          paymentMethod: true,
        },
      },
    },
    orderBy: { invoiceDate: 'desc' },
  });

  // Calculate job revenue by type
  const revenueByType = {
    mechanic: { revenue: 0, jobs: 0, materialsCost: 0, labourCost: 0 },
    sprayer: { revenue: 0, jobs: 0, materialsCost: 0, labourCost: 0 },
    bodyworks: { revenue: 0, jobs: 0, materialsCost: 0, labourCost: 0 },
  };

  let totalJobRevenue = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalMaterialsCost = 0;
  let totalLabourCost = 0;

  invoices.forEach(invoice => {
    const type = invoice.job.jobType;
    const revenue = parseFloat(invoice.totalAmount);
    const paid = parseFloat(invoice.amountPaid);
    const outstanding = parseFloat(invoice.amountDue);
    const materialsCost = parseFloat(invoice.materialsCost || 0);
    const labourCost = parseFloat(invoice.labourCost || 0);

    if (revenueByType[type]) {
      revenueByType[type].revenue += revenue;
      revenueByType[type].jobs += 1;
      revenueByType[type].materialsCost += materialsCost;
      revenueByType[type].labourCost += labourCost;
    }

    totalJobRevenue += revenue;
    totalPaid += paid;
    totalOutstanding += outstanding;
    totalMaterialsCost += materialsCost;
    totalLabourCost += labourCost;
  });

  // Materials usage in jobs
  const materialUsage = {};
  invoices.forEach(invoice => {
    invoice.job.materials.forEach(material => {
      if (!material.isExternal) {
        if (!materialUsage[material.materialName]) {
          materialUsage[material.materialName] = {
            quantity: 0,
            cost: 0,
          };
        }
        materialUsage[material.materialName].quantity += material.quantity;
        materialUsage[material.materialName].cost += parseFloat(material.subtotal);
      }
    });
  });

  // Payment status breakdown with detailed counts
  const paymentStatusRaw = await prisma.invoice.groupBy({
    by: ['paymentStatus'],
    where: invoiceWhere,
    _sum: {
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
    },
    _count: true,
  });

  // Transform payment status breakdown for easier frontend consumption
  const paymentStatusBreakdown = {
    unpaid: { count: 0, amount: 0, amountDue: 0 },
    partial: { count: 0, amount: 0, amountDue: 0 },
    paid: { count: 0, amount: 0, amountDue: 0 },
  };

  paymentStatusRaw.forEach(status => {
    const statusKey = status.paymentStatus?.toLowerCase() || 'unpaid';
    if (paymentStatusBreakdown[statusKey]) {
      paymentStatusBreakdown[statusKey].count = status._count;
      paymentStatusBreakdown[statusKey].amount = parseFloat(status._sum.totalAmount || 0);
      paymentStatusBreakdown[statusKey].amountDue = parseFloat(status._sum.amountDue || 0);
    }
  });

  res.status(200).json({
    success: true,
    period: {
      startDate: dateRange.gte,
      endDate: dateRange.lte,
    },
    data: {
      summary: {
        totalJobRevenue,
        totalPaid,
        totalOutstanding,
        totalMaterialsCost,
        totalLabourCost,
        totalJobs: invoices.length,
      },
      revenueByType,
      materialUsage: Object.entries(materialUsage).map(([name, data]) => ({
        materialName: name,
        ...data,
      })),
      paymentStatusBreakdown,
      paymentStatusRaw,
      recentJobs: invoices.slice(0, 10),
    },
  });
});

// @desc    Get Expense Report
// @route   GET /api/reports/expenses
// @access  Private (requires 'reports:view' permission)
// export const getExpenseReport = asyncHandler(async (req, res) => {
//   const { startDate, endDate, type, category } = req.query;
//   const dateRange = getDateRange(startDate, endDate);

//   const expenseWhere = {
//     expenseDate: dateRange,
//   };

//   if (type) {
//     expenseWhere.type = type;
//   }

//   if (category) {
//     expenseWhere.category = category;
//   }

//   const expenses = await prisma.expense.findMany({
//     where: expenseWhere,
//     include: {
//       user: {
//         select: { fullName: true, username: true },
//       },
//       materialReorder: {
//         select: {
//           materialName: true,
//           quantityOrdered: true,
//         },
//       },
//     },
//     orderBy: { expenseDate: 'desc' },
//   });

//   // Calculate totals by type (ONLY operational expenses, no COG)
//   let operationalTotal = 0;

//   expenses.forEach(expense => {
//     const amount = parseFloat(expense.amount);
//     if (expense.type === 'operational') {
//       operationalTotal += amount;
//     }
//   });

//   const totalExpenses = operationalTotal; // Only operational expenses

//   // Expenses by category - ONLY operational
//   const expensesByCategoryRaw = await prisma.expense.groupBy({
//     by: ['category'],
//     where: {
//       ...expenseWhere,
//       type: 'operational', // ONLY operational expenses
//     },
//     _sum: { amount: true },
//     _count: true,
//   });

//   const byCategory = expensesByCategoryRaw.map(cat => ({
//     category: cat.category,
//     amount: parseFloat(cat._sum.amount || 0),
//     count: cat._count,
//     percentage: totalExpenses > 0 
//       ? ((parseFloat(cat._sum.amount || 0) / totalExpenses) * 100).toFixed(1) 
//       : '0.0',
//   }));

//   // Expenses by type
//   const expensesByTypeRaw = await prisma.expense.groupBy({
//     by: ['type'],
//     where: expenseWhere,
//     _sum: { amount: true },
//     _count: true,
//   });

//   const byType = expensesByTypeRaw.map(t => ({
//     type: t.type,
//     amount: parseFloat(t._sum.amount || 0),
//     count: t._count,
//   }));

//   // Monthly trend - ONLY operational
//   let monthlyExpenses = [];
//   try {
//     monthlyExpenses = await prisma.$queryRaw`
//       SELECT 
//         DATE_TRUNC('month', expense_date)::TEXT as month,
//         SUM(amount)::DECIMAL as total
//       FROM expenses
//       WHERE expense_date >= ${dateRange.gte}
//         AND expense_date <= ${dateRange.lte}
//         AND type = 'operational'
//       GROUP BY DATE_TRUNC('month', expense_date)
//       ORDER BY month ASC
//     `;
//   } catch (error) {
//     console.error('Monthly expenses query error:', error);
//     monthlyExpenses = [];
//   }

//   // Count operational entries only
//   const operationalCount = await prisma.expense.count({
//     where: {
//       type: 'operational',
//       expenseDate: dateRange,
//     },
//   });

//   res.status(200).json({
//     success: true,
//     period: {
//       startDate: dateRange.gte,
//       endDate: dateRange.lte,
//     },
//     data: {
//       summary: {
//         totalExpenses,
//         operationalTotal,
//         totalTransactions: operationalCount,
//         operationalCount,
//       },
//       breakdown: {
//         byCategory,
//         byType,
//       },
//       monthlyTrend: monthlyExpenses,
//       recentExpenses: expenses.filter(e => e.type === 'operational').slice(0, 10),
//       allExpenses: expenses.filter(e => e.type === 'operational'),
//     },
//   });
// });

// @desc    Get Profit & Loss Statement
// @route   GET /api/reports/profit-loss
// @access  Private (requires 'reports:viewAdvanced' permission)




// version 2
// @desc    Get Expense Report (Aggregated for Finance Dashboard)
// @route   GET /api/reports/expenses
// @access  Private
// ... imports

// export const getExpenseReport = asyncHandler(async (req, res) => {
//   const { startDate, endDate, type, category } = req.query;
//   const dateRange = getDateRange(startDate, endDate);

//   const expenseWhere = {
//     expenseDate: dateRange,
//   };

//   // 1. Fetch ALL expenses
//   const expenses = await prisma.expense.findMany({
//     where: expenseWhere,
//     include: {
//       materialReorder: { select: { materialName: true, quantityOrdered: true } },
//     },
//     orderBy: { expenseDate: 'desc' },
//   });

//   // --- DEBUG LOG START ---
//   console.log(`[Report Debug] Found ${expenses.length} total expenses for range.`);
//   // --- DEBUG LOG END ---

//   // 2. Calculate Totals
//   let operationalTotal = 0;
//   let cogTotal = 0;
//   let materialReorderCount = 0;
//   let operationalCount = 0;

//   expenses.forEach(expense => {
//     const amount = parseFloat(expense.amount || 0);
//     const type = expense.type?.toLowerCase(); // Handle case sensitivity

//     // Check for both 'cog' and 'cost_of_goods' just to be safe
//     if (type === 'cog' || type === 'cost_of_goods') {
//         cogTotal += amount;
//         materialReorderCount++;
//     } else if (type === 'operational') {
//         operationalTotal += amount;
//         operationalCount++;
//     }
//   });

//   const totalExpenses = operationalTotal + cogTotal;
  
//   // --- DEBUG LOG START ---
//   console.log(`[Report Debug] COG Total: ${cogTotal}, Op Total: ${operationalTotal}`);
//   // --- DEBUG LOG END ---

//   // 3. Breakdown by Category (Operational Only)
//   const expensesByCategoryRaw = await prisma.expense.groupBy({
//     by: ['category'],
//     where: {
//       ...expenseWhere,
//       type: 'operational', 
//     },
//     _sum: { amount: true },
//     _count: true,
//   });

//   const byCategory = expensesByCategoryRaw.map(cat => ({
//     category: cat.category,
//     amount: parseFloat(cat._sum.amount || 0),
//     count: cat._count,
//     percentage: totalExpenses > 0 
//       ? ((parseFloat(cat._sum.amount || 0) / totalExpenses) * 100).toFixed(1) 
//       : '0.0',
//   }));

//   // 4. CRITICAL FIX: Manually add "Material Purchases" to the list
//   if (cogTotal > 0) {
//     byCategory.push({
//       category: 'Material Purchases', // This name will appear in your table
//       amount: cogTotal,
//       count: materialReorderCount,
//       percentage: totalExpenses > 0 
//         ? ((cogTotal / totalExpenses) * 100).toFixed(1) 
//         : '0.0',
//     });
//   }

//   // Sort: Highest amount first
//   byCategory.sort((a, b) => b.amount - a.amount);

//   // 5. Monthly Trend (FIXED TABLE NAME)
//   let monthlyExpenses = [];
//   try {
//     monthlyExpenses = await prisma.$queryRaw`
//       SELECT 
//         DATE_TRUNC('month', expense_date)::TEXT as month,
//         SUM(amount)::DECIMAL as total
//       FROM "expenses" -- <--- CHANGED "Expense" TO "expenses" (lowercase)
//       WHERE expense_date >= ${dateRange.gte}
//         AND expense_date <= ${dateRange.lte}
//       GROUP BY DATE_TRUNC('month', expense_date)
//       ORDER BY month ASC
//     `;
//   } catch (error) {
//     console.error('Monthly expenses query error:', error);
//     monthlyExpenses = [];
//   }

//   res.status(200).json({
//     success: true,
//     period: { startDate: dateRange.gte, endDate: dateRange.lte },
//     data: {
//       summary: {
//         totalExpenses,
//         operationalTotal,
//         cogTotal,
//         totalTransactions: expenses.length,
//         operationalCount,
//         materialReorderCount,
//       },
//       breakdown: {
//         byCategory, // This now includes Material Purchases
//         byType: [
//           { type: 'Operational', amount: operationalTotal },
//           { type: 'Cost of Goods', amount: cogTotal }
//         ]
//       },
//       monthlyTrend: monthlyExpenses,
//       recentExpenses: expenses.slice(0, 10),
//       allExpenses: expenses,
//     },
//   });
// });

// export const getProfitLoss = asyncHandler(async (req, res) => {
//   const { startDate, endDate } = req.query;
//   const dateRange = getDateRange(startDate, endDate);

//   // 1. Calculate Gross Revenue
//   const counterSales = await prisma.sale.aggregate({
//     where: {
//       status: 'completed',
//       saleDate: dateRange,
//     },
//     _sum: { totalAmount: true },
//   });

//   const counterSalesRevenue = parseFloat(counterSales._sum.totalAmount || 0);

//   const jobInvoices = await prisma.invoice.aggregate({
//     where: {
//       invoiceDate: dateRange,
//     },
//     _sum: { totalAmount: true },
//   });

//   const jobRevenue = parseFloat(jobInvoices._sum.totalAmount || 0);
//   const grossRevenue = counterSalesRevenue + jobRevenue;

//   // 2. Calculate ACTUAL COGS
//   const salesWithItems = await prisma.sale.findMany({
//     where: {
//       status: 'completed',
//       saleDate: dateRange,
//     },
//     include: {
//       items: {
//         where: {
//           itemType: 'material',
//         },
//       },
//     },
//   });

//   let materialCOGS = 0;
//   salesWithItems.forEach(sale => {
//     sale.items.forEach(item => {
//       const itemCOGS = parseFloat(item.unitCost || 0) * parseFloat(item.quantity || 0);
//       materialCOGS += itemCOGS;
//     });
//   });

//   const jobsWithMaterials = await prisma.invoice.findMany({
//     where: {
//       invoiceDate: dateRange,
//     },
//     include: {
//       job: {
//         include: {
//           materials: {
//             where: {
//               isExternal: false,
//             },
//           },
//         },
//       },
//     },
//   });

//   let jobMaterialsCOGS = 0;
//   jobsWithMaterials.forEach(invoice => {
//     invoice.job.materials.forEach(material => {
//       jobMaterialsCOGS += parseFloat(material.subtotal || 0);
//     });
//   });

//   const totalCOGS = materialCOGS + jobMaterialsCOGS;

//   // 3. Calculate Gross Profit
//   const grossProfit = grossRevenue - totalCOGS;

//   // 4. Calculate Operational Expenses
//   const operationalExpenses = await prisma.expense.aggregate({
//     where: {
//       type: 'operational',
//       expenseDate: dateRange,
//     },
//     _sum: { amount: true },
//   });

//   const operationalTotal = parseFloat(operationalExpenses._sum.amount || 0);

//   // 5. Calculate Net Profit
//   const netProfit = grossProfit - operationalTotal;

//   // 6. Get detailed revenue breakdown
//   const sales = await prisma.sale.findMany({
//     where: {
//       status: 'completed',
//       saleDate: dateRange,
//     },
//     include: { items: true },
//   });

//   let materialSalesRevenue = 0;
//   let boothSalesRevenue = 0;
//   let materialSalesCOGS = 0;

//   sales.forEach(sale => {
//     sale.items.forEach(item => {
//       if (item.itemType === 'material') {
//         materialSalesRevenue += parseFloat(item.subtotal || 0);
//         const itemCOGS = parseFloat(item.unitCost || 0) * parseFloat(item.quantity || 0);
//         materialSalesCOGS += itemCOGS;
//       } else if (item.itemType === 'booth') {
//         boothSalesRevenue += parseFloat(item.subtotal || 0);
//       }
//     });
//   });

//   // 7. Get job revenue breakdown
//   const invoicesWithJobs = await prisma.invoice.findMany({
//     where: {
//       invoiceDate: dateRange,
//     },
//     include: {
//       job: {
//         select: { jobType: true },
//       },
//     },
//   });

//   const jobRevenueByType = {
//     mechanic: 0,
//     sprayer: 0,
//     bodyworks: 0,
//   };

//   invoicesWithJobs.forEach(invoice => {
//     const type = invoice.job.jobType;
//     if (jobRevenueByType[type] !== undefined) {
//       jobRevenueByType[type] += parseFloat(invoice.totalAmount);
//     }
//   });

//   // 8. Get operational expenses by category
//   const operationalByCategory = await prisma.expense.groupBy({
//     by: ['category'],
//     where: {
//       type: 'operational',
//       expenseDate: dateRange,
//     },
//     _sum: { amount: true },
//   });

//   // 9. Calculate margins
//   const grossProfitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
//   const netProfitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

//   const materialGrossProfit = materialSalesRevenue - materialSalesCOGS;
//   const materialGrossProfitMargin = materialSalesRevenue > 0 
//     ? (materialGrossProfit / materialSalesRevenue) * 100 
//     : 0;

//   const jobGrossProfit = jobRevenue - jobMaterialsCOGS;
//   const jobGrossProfitMargin = jobRevenue > 0 
//     ? (jobGrossProfit / jobRevenue) * 100 
//     : 0;

//   res.status(200).json({
//     success: true,
//     period: {
//       startDate: dateRange.gte,
//       endDate: dateRange.lte,
//     },
//     data: {
//       // Summary
//       summary: {
//         grossRevenue,
//         cogs: totalCOGS,
//         grossProfit,
//         operationalExpenses: operationalTotal,
//         netProfit,
//         grossProfitMargin: grossProfitMargin.toFixed(2),
//         netProfitMargin: netProfitMargin.toFixed(2),
//       },

//       // Revenue Breakdown
//       revenue: {
//         total: grossRevenue,
//         sources: {
//           counterSales: counterSalesRevenue,
//           jobs: jobRevenue,
//         },
//         counterSalesBreakdown: {
//           materials: {
//             revenue: materialSalesRevenue,
//             cogs: materialSalesCOGS,
//             grossProfit: materialGrossProfit,
//             grossProfitMargin: materialGrossProfitMargin.toFixed(2),
//           },
//           booth: {
//             revenue: boothSalesRevenue,
//             cogs: 0,
//             grossProfit: boothSalesRevenue,
//             grossProfitMargin: '100.00',
//           },
//         },
//         jobRevenueByType,
//         jobProfitAnalysis: {
//           revenue: jobRevenue,
//           materialCosts: jobMaterialsCOGS,
//           grossProfit: jobGrossProfit,
//           grossProfitMargin: jobGrossProfitMargin.toFixed(2),
//         },
//       },

//       // Cost Breakdown
//       costs: {
//         cogs: {
//           total: totalCOGS,
//           breakdown: {
//             materialsSold: materialSalesCOGS,
//             jobMaterials: jobMaterialsCOGS,
//           },
//         },
//         operational: {
//           total: operationalTotal,
//           byCategory: operationalByCategory,
//         },
//         totalCosts: totalCOGS + operationalTotal,
//       },

//       // Profitability
//       profitability: {
//         grossProfit,
//         grossProfitMargin: `${grossProfitMargin.toFixed(2)}%`,
//         netProfit,
//         netProfitMargin: `${netProfitMargin.toFixed(2)}%`,
//       },
//     },
//   });
// });

export const getExpenseReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, type, category } = req.query;
  const dateRange = getDateRange(startDate, endDate);

  const expenseWhere = {
    expenseDate: dateRange,
  };

  // 1. Fetch ALL expenses
  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    include: {
      materialReorder: { select: { materialName: true, quantityOrdered: true } },
    },
    orderBy: { expenseDate: 'desc' },
  });

  // 2. Calculate Totals
  let operationalTotal = 0;
  let cogTotal = 0; // This will now hold Old COGS + New Manual Material Purchases
  let materialReorderCount = 0;
  let operationalCount = 0;

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount || 0);
    const type = expense.type?.toLowerCase(); 
    const cat = expense.category?.toLowerCase();

    // --- LOGIC UPDATE START ---
    // Check for Old COGS ('cog') OR New Manual Material Purchases ('materials')
    const isMaterialPurchase = 
      type === 'cog' || 
      type === 'cost_of_goods' || 
      cat === 'materials'; // <--- NEW CHECK

    if (isMaterialPurchase) {
        cogTotal += amount;
        materialReorderCount++;
    } else if (type === 'operational') {
        operationalTotal += amount;
        operationalCount++;
    }
    // --- LOGIC UPDATE END ---
  });

  const totalExpenses = operationalTotal + cogTotal;

  // 3. Breakdown by Category (Operational Only - Excluding Materials)
  const expensesByCategoryRaw = await prisma.expense.groupBy({
    by: ['category'],
    where: {
      ...expenseWhere,
      type: 'operational',
      category: { not: 'materials' } // <--- EXCLUDE MATERIALS HERE
    },
    _sum: { amount: true },
    _count: true,
  });

  const byCategory = expensesByCategoryRaw.map(cat => ({
    category: cat.category,
    amount: parseFloat(cat._sum.amount || 0),
    count: cat._count,
    percentage: totalExpenses > 0 
      ? ((parseFloat(cat._sum.amount || 0) / totalExpenses) * 100).toFixed(1) 
      : '0.0',
  }));

  // 4. Manually add "Material Purchases" bucket
  if (cogTotal > 0) {
    byCategory.push({
      category: 'Material Purchases', 
      amount: cogTotal,
      count: materialReorderCount,
      percentage: totalExpenses > 0 
        ? ((cogTotal / totalExpenses) * 100).toFixed(1) 
        : '0.0',
    });
  }

  // Sort: Highest amount first
  byCategory.sort((a, b) => b.amount - a.amount);

  // 5. Monthly Trend
  let monthlyExpenses = [];
  try {
    monthlyExpenses = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', expense_date)::TEXT as month,
        SUM(amount)::DECIMAL as total
      FROM "expenses"
      WHERE expense_date >= ${dateRange.gte}
        AND expense_date <= ${dateRange.lte}
      GROUP BY DATE_TRUNC('month', expense_date)
      ORDER BY month ASC
    `;
  } catch (error) {
    console.error('Monthly expenses query error:', error);
    monthlyExpenses = [];
  }

  res.status(200).json({
    success: true,
    period: { startDate: dateRange.gte, endDate: dateRange.lte },
    data: {
      summary: {
        totalExpenses,
        operationalTotal,
        cogTotal, // Labelled as "Material Purchases" in UI usually
        totalTransactions: expenses.length,
        operationalCount,
        materialReorderCount,
      },
      breakdown: {
        byCategory,
        byType: [
          { type: 'Operational', amount: operationalTotal },
          { type: 'Material Purchases', amount: cogTotal }
        ]
      },
      monthlyTrend: monthlyExpenses,
      recentExpenses: expenses.slice(0, 10),
      allExpenses: expenses,
    },
  });
});

export const getProfitLoss = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateRange = getDateRange(startDate, endDate);

  // 1. Calculate Gross Revenue
  const counterSales = await prisma.sale.aggregate({
    where: {
      status: 'completed',
      saleDate: dateRange,
    },
    _sum: { totalAmount: true },
  });

  const counterSalesRevenue = parseFloat(counterSales._sum.totalAmount || 0);

  const jobInvoices = await prisma.invoice.aggregate({
    where: {
      invoiceDate: dateRange,
    },
    _sum: { totalAmount: true },
  });

  const jobRevenue = parseFloat(jobInvoices._sum.totalAmount || 0);
  const grossRevenue = counterSalesRevenue + jobRevenue;

  // 2. Calculate ACTUAL COGS (Based on SALES/USAGE, not purchases)
  // [Diagram of Accrual Accounting]
  // We calculate cost when items leave the shelf (Sales), not when they enter (Expenses)
  const salesWithItems = await prisma.sale.findMany({
    where: {
      status: 'completed',
      saleDate: dateRange,
    },
    include: {
      items: {
        where: { itemType: 'material' },
      },
    },
  });

  let materialCOGS = 0;
  salesWithItems.forEach(sale => {
    sale.items.forEach(item => {
      const itemCOGS = parseFloat(item.unitCost || 0) * parseFloat(item.quantity || 0);
      materialCOGS += itemCOGS;
    });
  });

  const jobsWithMaterials = await prisma.invoice.findMany({
    where: {
      invoiceDate: dateRange,
    },
    include: {
      job: {
        include: {
          materials: {
            where: { isExternal: false },
          },
        },
      },
    },
  });

  let jobMaterialsCOGS = 0;
  jobsWithMaterials.forEach(invoice => {
    invoice.job.materials.forEach(material => {
      jobMaterialsCOGS += parseFloat(material.subtotal || 0);
    });
  });

  const totalCOGS = materialCOGS + jobMaterialsCOGS;

  // 3. Calculate Gross Profit
  const grossProfit = grossRevenue - totalCOGS;

  // 4. Calculate Operational Expenses
  // --- CRITICAL FIX START ---
  // We must EXCLUDE 'materials' category here. 
  // Why? Because the cost of materials is already subtracted above in 'totalCOGS' (when sold).
  // If we subtract 'materials' purchases here too, we are double-counting the cost.
  const operationalExpenses = await prisma.expense.aggregate({
    where: {
      type: 'operational',
      category: { not: 'materials' }, // <--- Filter out Stock Purchases
      expenseDate: dateRange,
    },
    _sum: { amount: true },
  });
  // --- CRITICAL FIX END ---

  const operationalTotal = parseFloat(operationalExpenses._sum.amount || 0);

  // 5. Calculate Net Profit
  const netProfit = grossProfit - operationalTotal;

  // 6. Get detailed revenue breakdown (Existing logic...)
  const sales = await prisma.sale.findMany({
    where: { status: 'completed', saleDate: dateRange },
    include: { items: true },
  });

  let materialSalesRevenue = 0;
  let boothSalesRevenue = 0;
  let materialSalesCOGS = 0;

  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (item.itemType === 'material') {
        materialSalesRevenue += parseFloat(item.subtotal || 0);
        const itemCOGS = parseFloat(item.unitCost || 0) * parseFloat(item.quantity || 0);
        materialSalesCOGS += itemCOGS;
      } else if (item.itemType === 'booth') {
        boothSalesRevenue += parseFloat(item.subtotal || 0);
      }
    });
  });

  // 7. Get job revenue breakdown (Existing logic...)
  const invoicesWithJobs = await prisma.invoice.findMany({
    where: { invoiceDate: dateRange },
    include: { job: { select: { jobType: true } } },
  });

  const jobRevenueByType = { mechanic: 0, sprayer: 0, bodyworks: 0 };
  invoicesWithJobs.forEach(invoice => {
    const type = invoice.job.jobType;
    if (jobRevenueByType[type] !== undefined) {
      jobRevenueByType[type] += parseFloat(invoice.totalAmount);
    }
  });

  // 8. Get operational expenses by category (Existing logic with FIX)
  const operationalByCategory = await prisma.expense.groupBy({
    by: ['category'],
    where: {
      type: 'operational',
      category: { not: 'materials' }, // <--- Filter out Stock Purchases
      expenseDate: dateRange,
    },
    _sum: { amount: true },
  });

  // 9. Calculate margins
  const grossProfitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
  const netProfitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
  const materialGrossProfit = materialSalesRevenue - materialSalesCOGS;
  const materialGrossProfitMargin = materialSalesRevenue > 0 ? (materialGrossProfit / materialSalesRevenue) * 100 : 0;
  const jobGrossProfit = jobRevenue - jobMaterialsCOGS;
  const jobGrossProfitMargin = jobRevenue > 0 ? (jobGrossProfit / jobRevenue) * 100 : 0;

  res.status(200).json({
    success: true,
    period: { startDate: dateRange.gte, endDate: dateRange.lte },
    data: {
      summary: {
        grossRevenue,
        cogs: totalCOGS,
        grossProfit,
        operationalExpenses: operationalTotal,
        netProfit,
        grossProfitMargin: grossProfitMargin.toFixed(2),
        netProfitMargin: netProfitMargin.toFixed(2),
      },
      revenue: {
        total: grossRevenue,
        sources: { counterSales: counterSalesRevenue, jobs: jobRevenue },
        counterSalesBreakdown: {
          materials: {
            revenue: materialSalesRevenue,
            cogs: materialSalesCOGS,
            grossProfit: materialGrossProfit,
            grossProfitMargin: materialGrossProfitMargin.toFixed(2),
          },
          booth: {
            revenue: boothSalesRevenue,
            cogs: 0,
            grossProfit: boothSalesRevenue,
            grossProfitMargin: '100.00',
          },
        },
        jobRevenueByType,
        jobProfitAnalysis: {
          revenue: jobRevenue,
          materialCosts: jobMaterialsCOGS,
          grossProfit: jobGrossProfit,
          grossProfitMargin: jobGrossProfitMargin.toFixed(2),
        },
      },
      costs: {
        cogs: {
          total: totalCOGS,
          breakdown: { materialsSold: materialSalesCOGS, jobMaterials: jobMaterialsCOGS },
        },
        operational: {
          total: operationalTotal,
          byCategory: operationalByCategory,
        },
        totalCosts: totalCOGS + operationalTotal,
      },
      profitability: {
        grossProfit,
        grossProfitMargin: `${grossProfitMargin.toFixed(2)}%`,
        netProfit,
        netProfitMargin: `${netProfitMargin.toFixed(2)}%`,
      },
    },
  });
});

// @desc    Get Revenue Breakdown Report
// @route   GET /api/reports/revenue
// @access  Private (requires 'reports:view' permission)
export const getRevenueReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateRange = getDateRange(startDate, endDate);

  // Counter sales revenue
  const counterSales = await prisma.sale.findMany({
    where: {
      status: 'completed',
      saleDate: dateRange,
    },
    include: { items: true },
  });

  let materialRevenue = 0;
  let boothRevenue = 0;

  counterSales.forEach(sale => {
    sale.items.forEach(item => {
      if (item.itemType === 'material') {
        materialRevenue += parseFloat(item.subtotal);
      } else if (item.itemType === 'booth') {
        boothRevenue += parseFloat(item.subtotal);
      }
    });
  });

  // Job revenue by type
  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceDate: dateRange,
    },
    include: {
      job: {
        select: { jobType: true },
      },
    },
  });

  const jobRevenue = {
    mechanic: 0,
    sprayer: 0,
    bodyworks: 0,
  };

  let totalJobRevenue = 0;

  invoices.forEach(invoice => {
    const amount = parseFloat(invoice.totalAmount);
    const type = invoice.job.jobType;
    if (jobRevenue[type] !== undefined) {
      jobRevenue[type] += amount;
    }
    totalJobRevenue += amount;
  });

  const totalRevenue = materialRevenue + boothRevenue + totalJobRevenue;

  // Calculate percentages
  const percentages = {
    materials: totalRevenue > 0 ? (materialRevenue / totalRevenue) * 100 : 0,
    booth: totalRevenue > 0 ? (boothRevenue / totalRevenue) * 100 : 0,
    jobs: totalRevenue > 0 ? (totalJobRevenue / totalRevenue) * 100 : 0,
  };

  res.status(200).json({
    success: true,
    period: {
      startDate: dateRange.gte,
      endDate: dateRange.lte,
    },
    data: {
      totalRevenue,
      sources: {
        materials: {
          amount: materialRevenue,
          percentage: percentages.materials.toFixed(2),
        },
        booth: {
          amount: boothRevenue,
          percentage: percentages.booth.toFixed(2),
        },
        jobs: {
          amount: totalJobRevenue,
          percentage: percentages.jobs.toFixed(2),
          breakdown: jobRevenue,
        },
      },
    },
  });
});

// @desc    Get Material Usage Report
// @route   GET /api/reports/material-usage
// @access  Private (requires 'reports:view' permission)
export const getMaterialUsageReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateRange = getDateRange(startDate, endDate);

  // Materials sold in counter sales
  const sales = await prisma.sale.findMany({
    where: {
      status: 'completed',
      saleDate: dateRange,
    },
    include: {
      items: {
        where: { itemType: 'material' },
      },
    },
  });

  const counterSalesUsage = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!counterSalesUsage[item.materialName]) {
        counterSalesUsage[item.materialName] = {
          quantity: 0,
          revenue: 0,
          cost: 0,  // ADD THIS
          profit: 0, // ADD THIS
          usedInSales: 0,
        };
      }
      counterSalesUsage[item.materialName].quantity += parseFloat(item.quantity || 0);
      counterSalesUsage[item.materialName].revenue += parseFloat(item.subtotal || 0);
      
      // ADD COST CALCULATION
      const itemCost = parseFloat(item.unitCost || 0) * parseFloat(item.quantity || 0);
      counterSalesUsage[item.materialName].cost += itemCost;
      
      counterSalesUsage[item.materialName].usedInSales += parseFloat(item.quantity || 0);
    });
  });

  // Calculate profit for counter sales
  Object.keys(counterSalesUsage).forEach(materialName => {
    counterSalesUsage[materialName].profit = 
      counterSalesUsage[materialName].revenue - counterSalesUsage[materialName].cost;
  });

  // Materials used in jobs (same as before)
  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceDate: dateRange,
    },
    include: {
      job: {
        include: {
          materials: {
            where: { isExternal: false },
          },
        },
      },
    },
  });

  const jobMaterialUsage = {};
  invoices.forEach(invoice => {
    invoice.job.materials.forEach(material => {
      if (!jobMaterialUsage[material.materialName]) {
        jobMaterialUsage[material.materialName] = {
          quantity: 0,
          cost: 0,
          usedInJobs: 0,
        };
      }
      jobMaterialUsage[material.materialName].quantity += parseFloat(material.quantity || 0);
      jobMaterialUsage[material.materialName].cost += parseFloat(material.subtotal || 0);
      jobMaterialUsage[material.materialName].usedInJobs += parseFloat(material.quantity || 0);
    });
  });

  // Combine usage
  const allMaterials = new Set([
    ...Object.keys(counterSalesUsage),
    ...Object.keys(jobMaterialUsage),
  ]);

  const materialUsage = Array.from(allMaterials).map(name => {
    const counterData = counterSalesUsage[name] || { 
      quantity: 0, 
      revenue: 0, 
      cost: 0,
      profit: 0,
      usedInSales: 0 
    };
    const jobData = jobMaterialUsage[name] || { 
      quantity: 0, 
      cost: 0, 
      usedInJobs: 0 
    };

    return {
      materialName: name,
      counterSales: counterData,
      jobs: jobData,
      usedInSales: counterData.usedInSales,
      usedInJobs: jobData.usedInJobs,
      totalQuantity: counterData.quantity + jobData.quantity,
      totalRevenue: counterData.revenue,
      totalCost: counterData.cost + jobData.cost,
      totalProfit: counterData.profit,
      profitMargin: counterData.revenue > 0 
        ? ((counterData.profit / counterData.revenue) * 100).toFixed(2) 
        : '0.00',
    };
  });

  // Sort by total profit (most profitable first)
  materialUsage.sort((a, b) => b.totalProfit - a.totalProfit);

  res.status(200).json({
    success: true,
    period: {
      startDate: dateRange.gte,
      endDate: dateRange.lte,
    },
    data: {
      topMaterials: materialUsage.slice(0, 10),
      allMaterials: materialUsage,
      summary: {
        totalRevenue: materialUsage.reduce((sum, m) => sum + m.totalRevenue, 0),
        totalCost: materialUsage.reduce((sum, m) => sum + m.totalCost, 0),
        totalProfit: materialUsage.reduce((sum, m) => sum + m.totalProfit, 0),
      },
    },
  });
});

// @desc    Get Dashboard Overview
// @route   GET /api/reports/dashboard
// @access  Private
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const dateRange = getDateRange(); // Current month by default

  // Quick stats
  const [
    totalSales,
    totalInvoices,
    pendingInvoices,
    lowStockMaterials,
  ] = await Promise.all([
    prisma.sale.count({
      where: {
        status: 'completed',
        saleDate: dateRange,
      },
    }),
    prisma.invoice.count({
      where: { invoiceDate: dateRange },
    }),
    prisma.invoice.count({
      where: {
        paymentStatus: { in: ['unpaid', 'partial'] },
      },
    }),
    prisma.material.count({
      where: {
        isActive: true,
        quantity: { lte: prisma.material.fields.lowStockThreshold },
      },
    }),
  ]);

  // Revenue overview (current month)
  const salesRevenue = await prisma.sale.aggregate({
    where: {
      status: 'completed',
      saleDate: dateRange,
    },
    _sum: { totalAmount: true },
  });

  const jobRevenue = await prisma.invoice.aggregate({
    where: { invoiceDate: dateRange },
    _sum: { totalAmount: true },
  });

  const totalRevenue = 
    parseFloat(salesRevenue._sum.totalAmount || 0) + 
    parseFloat(jobRevenue._sum.totalAmount || 0);

  // Outstanding payments
  const outstanding = await prisma.invoice.aggregate({
    where: {
      paymentStatus: { in: ['unpaid', 'partial'] },
    },
    _sum: { amountDue: true },
  });

  res.status(200).json({
    success: true,
    period: {
      startDate: dateRange.gte,
      endDate: dateRange.lte,
    },
    data: {
      sales: {
        count: totalSales,
        revenue: salesRevenue._sum.totalAmount || 0,
      },
      jobs: {
        count: totalInvoices,
        revenue: jobRevenue._sum.totalAmount || 0,
      },
      totalRevenue,
      outstanding: {
        count: pendingInvoices,
        amount: outstanding._sum.amountDue || 0,
      },
      alerts: {
        lowStockMaterials,
      },
    },
  });
});