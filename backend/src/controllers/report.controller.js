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
  const dailySales = await prisma.$queryRaw`
    SELECT 
      DATE(sale_date) as date,
      COUNT(*) as count,
      SUM(total_amount) as total
    FROM sales
    WHERE status = 'completed'
      AND sale_date >= ${dateRange.gte}
      AND sale_date <= ${dateRange.lte}
    GROUP BY DATE(sale_date)
    ORDER BY date ASC
  `;

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

  invoices.forEach(invoice => {
    const type = invoice.job.jobType;
    const revenue = parseFloat(invoice.totalAmount);
    const paid = parseFloat(invoice.amountPaid);
    const outstanding = parseFloat(invoice.amountDue);

    if (revenueByType[type]) {
      revenueByType[type].revenue += revenue;
      revenueByType[type].jobs += 1;
      revenueByType[type].materialsCost += parseFloat(invoice.materialsCost);
      revenueByType[type].labourCost += parseFloat(invoice.labourCost);
    }

    totalJobRevenue += revenue;
    totalPaid += paid;
    totalOutstanding += outstanding;
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

  // Payment status breakdown
  const paymentStatusBreakdown = await prisma.invoice.groupBy({
    by: ['paymentStatus'],
    where: invoiceWhere,
    _sum: {
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
    },
    _count: true,
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
        totalJobs: invoices.length,
      },
      revenueByType,
      materialUsage: Object.entries(materialUsage).map(([name, data]) => ({
        materialName: name,
        ...data,
      })),
      paymentStatusBreakdown,
      recentJobs: invoices.slice(0, 10),
    },
  });
});

// @desc    Get Expense Report
// @route   GET /api/reports/expenses
// @access  Private (requires 'reports:view' permission)
export const getExpenseReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, type, category } = req.query;
  const dateRange = getDateRange(startDate, endDate);

  const expenseWhere = {
    expenseDate: dateRange,
  };

  if (type) {
    expenseWhere.type = type;
  }

  if (category) {
    expenseWhere.category = category;
  }

  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    include: {
      user: {
        select: { fullName: true, username: true },
      },
      materialReorder: {
        select: {
          materialName: true,
          quantityOrdered: true,
        },
      },
    },
    orderBy: { expenseDate: 'desc' },
  });

  // Calculate totals by type
  let cogTotal = 0;
  let operationalTotal = 0;

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount);
    if (expense.type === 'cog') {
      cogTotal += amount;
    } else if (expense.type === 'operational') {
      operationalTotal += amount;
    }
  });

  const totalExpenses = cogTotal + operationalTotal;

  // Expenses by category
  const expensesByCategory = await prisma.expense.groupBy({
    by: ['category'],
    where: expenseWhere,
    _sum: { amount: true },
    _count: true,
  });

  // Expenses by type
  const expensesByType = await prisma.expense.groupBy({
    by: ['type'],
    where: expenseWhere,
    _sum: { amount: true },
    _count: true,
  });

  // Monthly trend
  const monthlyExpenses = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', expense_date) as month,
      type,
      SUM(amount) as total
    FROM expenses
    WHERE expense_date >= ${dateRange.gte}
      AND expense_date <= ${dateRange.lte}
    GROUP BY DATE_TRUNC('month', expense_date), type
    ORDER BY month ASC
  `;

  res.status(200).json({
    success: true,
    period: {
      startDate: dateRange.gte,
      endDate: dateRange.lte,
    },
    data: {
      summary: {
        totalExpenses,
        cogTotal,
        operationalTotal,
        totalTransactions: expenses.length,
      },
      breakdown: {
        byCategory: expensesByCategory,
        byType: expensesByType,
      },
      monthlyTrend: monthlyExpenses,
      recentExpenses: expenses.slice(0, 10),
      allExpenses: expenses,
    },
  });
});

// @desc    Get Profit & Loss Statement
// @route   GET /api/reports/profit-loss
// @access  Private (requires 'reports:viewAdvanced' permission)
export const getProfitLoss = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateRange = getDateRange(startDate, endDate);

  // 1. Calculate Gross Revenue (Materials + Booth + Jobs)
  
  // Materials & Booth from counter sales
  const counterSales = await prisma.sale.aggregate({
    where: {
      status: 'completed',
      saleDate: dateRange,
    },
    _sum: { totalAmount: true },
  });

  const counterSalesRevenue = parseFloat(counterSales._sum.totalAmount || 0);

  // Job revenue from invoices
  const jobInvoices = await prisma.invoice.aggregate({
    where: {
      invoiceDate: dateRange,
    },
    _sum: { totalAmount: true },
  });

  const jobRevenue = parseFloat(jobInvoices._sum.totalAmount || 0);

  const grossRevenue = counterSalesRevenue + jobRevenue;

  // 2. Calculate COGS (Material Reorders)
  const cogExpenses = await prisma.expense.aggregate({
    where: {
      type: 'cog',
      expenseDate: dateRange,
    },
    _sum: { amount: true },
  });

  const cogs = parseFloat(cogExpenses._sum.amount || 0);

  // 3. Calculate Gross Profit
  const grossProfit = grossRevenue - cogs;

  // 4. Calculate Operational Expenses
  const operationalExpenses = await prisma.expense.aggregate({
    where: {
      type: 'operational',
      expenseDate: dateRange,
    },
    _sum: { amount: true },
  });

  const operationalTotal = parseFloat(operationalExpenses._sum.amount || 0);

  // 5. Calculate Net Profit
  const netProfit = grossProfit - operationalTotal;

  // 6. Get detailed revenue breakdown
  const sales = await prisma.sale.findMany({
    where: {
      status: 'completed',
      saleDate: dateRange,
    },
    include: { items: true },
  });

  let materialSalesRevenue = 0;
  let boothSalesRevenue = 0;

  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (item.itemType === 'material') {
        materialSalesRevenue += parseFloat(item.subtotal);
      } else if (item.itemType === 'booth') {
        boothSalesRevenue += parseFloat(item.subtotal);
      }
    });
  });

  // 7. Get job revenue breakdown by type
  const jobsByType = await prisma.invoice.groupBy({
    by: ['job'],
    where: {
      invoiceDate: dateRange,
    },
    _sum: {
      totalAmount: true,
      materialsCost: true,
      labourCost: true,
    },
  });

  // Get job types
  const invoicesWithJobs = await prisma.invoice.findMany({
    where: {
      invoiceDate: dateRange,
    },
    include: {
      job: {
        select: { jobType: true },
      },
    },
  });

  const jobRevenueByType = {
    mechanic: 0,
    sprayer: 0,
    bodyworks: 0,
  };

  invoicesWithJobs.forEach(invoice => {
    const type = invoice.job.jobType;
    if (jobRevenueByType[type] !== undefined) {
      jobRevenueByType[type] += parseFloat(invoice.totalAmount);
    }
  });

  // 8. Get operational expenses by category
  const operationalByCategory = await prisma.expense.groupBy({
    by: ['category'],
    where: {
      type: 'operational',
      expenseDate: dateRange,
    },
    _sum: { amount: true },
  });

  // 9. Calculate margins
  const grossProfitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
  const netProfitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  res.status(200).json({
    success: true,
    period: {
      startDate: dateRange.gte,
      endDate: dateRange.lte,
    },
    data: {
      // Summary
      summary: {
        grossRevenue,
        cogs,
        grossProfit,
        operationalExpenses: operationalTotal,
        netProfit,
        grossProfitMargin: grossProfitMargin.toFixed(2),
        netProfitMargin: netProfitMargin.toFixed(2),
      },

      // Revenue Breakdown
      revenue: {
        total: grossRevenue,
        sources: {
          counterSales: counterSalesRevenue,
          jobs: jobRevenue,
        },
        counterSalesBreakdown: {
          materials: materialSalesRevenue,
          booth: boothSalesRevenue,
        },
        jobRevenueByType,
      },

      // Cost Breakdown
      costs: {
        cogs: {
          total: cogs,
          description: 'Material Reorders',
        },
        operational: {
          total: operationalTotal,
          byCategory: operationalByCategory,
        },
        totalCosts: cogs + operationalTotal,
      },

      // Profitability
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
        };
      }
      counterSalesUsage[item.materialName].quantity += item.quantity;
      counterSalesUsage[item.materialName].revenue += parseFloat(item.subtotal);
    });
  });

  // Materials used in jobs
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
        };
      }
      jobMaterialUsage[material.materialName].quantity += material.quantity;
      jobMaterialUsage[material.materialName].cost += parseFloat(material.subtotal);
    });
  });

  // Combine usage
  const allMaterials = new Set([
    ...Object.keys(counterSalesUsage),
    ...Object.keys(jobMaterialUsage),
  ]);

  const materialUsage = Array.from(allMaterials).map(name => ({
    materialName: name,
    counterSales: counterSalesUsage[name] || { quantity: 0, revenue: 0 },
    jobs: jobMaterialUsage[name] || { quantity: 0, cost: 0 },
    totalQuantity: 
      (counterSalesUsage[name]?.quantity || 0) + 
      (jobMaterialUsage[name]?.quantity || 0),
    totalValue: 
      (counterSalesUsage[name]?.revenue || 0) + 
      (jobMaterialUsage[name]?.cost || 0),
  }));

  // Sort by total quantity
  materialUsage.sort((a, b) => b.totalQuantity - a.totalQuantity);

  res.status(200).json({
    success: true,
    period: {
      startDate: dateRange.gte,
      endDate: dateRange.lte,
    },
    data: {
      topMaterials: materialUsage.slice(0, 10),
      allMaterials: materialUsage,
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