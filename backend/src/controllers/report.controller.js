import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { format} from 'date-fns';

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

// Helper: Calculate Percentage Change
const calculateTrend = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0; // If prev was 0 and now we have sales, it's 100% up
  return ((current - previous) / previous) * 100;
};

// Helper: Calculate job service revenue (labour + misc only), prorated by payment rate
const calcJobRevenue = (invoices) => invoices.reduce((sum, inv) => {
  const serviceTotal = parseFloat(inv.labourCost || 0) + parseFloat(inv.miscellaneousCost || 0);
  const total = parseFloat(inv.totalAmount || 0);
  const paymentRate = total > 0 ? Math.min(parseFloat(inv.amountPaid || 0) / total, 1) : 0;
  return sum + (serviceTotal * paymentRate);
}, 0);

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
  const sales = await req.db.sale.findMany({
    where: salesWhere,
    include: {
      items: {
        include: {
          material: {
            select: { name: true },
          },
          service: {
            select: { type: true, name: true, category: true },
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
    const paymentRate = parseFloat(sale.totalAmount) > 0
      ? Math.min(parseFloat(sale.amountPaid) / parseFloat(sale.totalAmount), 1)
      : 0;
    sale.items.forEach(item => {
      if (item.itemType === 'material') {
        materialSales += parseFloat(item.subtotal) * paymentRate;
        materialItems.push({
          saleId: sale.id,
          saleDate: sale.saleDate,
          materialName: item.materialName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        });
      } else if (item.itemType === 'booth') {
        boothSales += parseFloat(item.subtotal) * paymentRate;
        boothItems.push({
          saleId: sale.id,
          saleDate: sale.saleDate,
          serviceName: item.service?.name || null,
          category: item.service?.category || null,
          type: item.service?.type || null,
          price: item.unitPrice,
          subtotal: item.subtotal,
        });
      }
    });
  });

  const totalSalesRevenue = materialSales + boothSales;

  // Sales by payment method
  const salesByMethod = await req.db.sale.groupBy({
    by: ['paymentMethod'],
    where: salesWhere,
    _sum: { amountPaid: true },
    _count: true,
  });

  // Daily sales trend
  let dailySales = [];
  try {
    dailySales = await req.db.$queryRaw`
      SELECT 
        DATE(sale_date)::TEXT as date,
        COUNT(*)::INTEGER as count,
        SUM(amount_paid)::DECIMAL as total
      FROM sales
      WHERE status = 'completed'
        AND business_id = ${req.user.businessId}
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

  const invoices = await req.db.invoice.findMany({
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
  // Revenue = Labour + Miscellaneous only (materials are reference; bought at sales counter)
  // Cash basis: prorated by payment rate (amountPaid / totalAmount)
  const revenueByType = {
    mechanic:  { revenue: 0, jobs: 0, materialsCost: 0, labourCost: 0, miscellaneousCost: 0 },
    sprayer:   { revenue: 0, jobs: 0, materialsCost: 0, labourCost: 0, miscellaneousCost: 0 },
    bodyworks: { revenue: 0, jobs: 0, materialsCost: 0, labourCost: 0, miscellaneousCost: 0 },
  };

  let totalJobRevenue = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalMaterialsCost = 0;
  let totalLabourCost = 0;
  let totalMiscellaneousCost = 0;

  invoices.forEach(invoice => {
    const type = invoice.job.jobType;
    const total = parseFloat(invoice.totalAmount || 0);
    const paid = parseFloat(invoice.amountPaid || 0);
    const outstanding = parseFloat(invoice.amountDue || 0);
    const materialsCost = parseFloat(invoice.materialsCost || 0);
    const labourCost = parseFloat(invoice.labourCost || 0);
    const miscellaneousCost = parseFloat(invoice.miscellaneousCost || 0);

    // Service revenue = labour + misc, prorated by how much has been paid
    const serviceTotal = labourCost + miscellaneousCost;
    const paymentRate = total > 0 ? Math.min(paid / total, 1) : 0;
    const revenue = serviceTotal * paymentRate;

    if (revenueByType[type]) {
      revenueByType[type].revenue += revenue;
      revenueByType[type].jobs += 1;
      revenueByType[type].materialsCost += materialsCost;
      revenueByType[type].labourCost += labourCost;
      revenueByType[type].miscellaneousCost += miscellaneousCost;
    }

    totalJobRevenue += revenue;
    totalPaid += paid;
    totalOutstanding += outstanding;
    totalMaterialsCost += materialsCost;
    totalLabourCost += labourCost;
    totalMiscellaneousCost += miscellaneousCost;
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
  const paymentStatusRaw = await req.db.invoice.groupBy({
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
        totalJobRevenue,   // service revenue earned (labour+misc × payment rate)
        totalPaid,         // total cash received
        totalOutstanding,  // total amountDue remaining
        totalMaterialsCost,
        totalLabourCost,
        totalMiscellaneousCost,
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

export const getExpenseReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, type, category } = req.query;
  const dateRange = getDateRange(startDate, endDate);

  const expenseWhere = {
    expenseDate: dateRange,
  };

  // 1. Fetch ALL expenses
  const expenses = await req.db.expense.findMany({
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
  const expensesByCategoryRaw = await req.db.expense.groupBy({
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
    monthlyExpenses = await req.db.$queryRaw`
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
  const counterSales = await req.db.sale.aggregate({
    where: {
      status: 'completed',
      saleDate: dateRange,
    },
    _sum: { amountPaid: true },
  });

  const counterSalesRevenue = parseFloat(counterSales._sum.amountPaid || 0);

  // Job revenue = Labour + Miscellaneous only (materials are reference; bought at sales counter)
  // Cash basis: prorated by amountPaid / totalAmount per invoice
  const jobInvoicesList = await req.db.invoice.findMany({
    where: { invoiceDate: dateRange },
    select: {
      labourCost: true,
      miscellaneousCost: true,
      totalAmount: true,
      amountPaid: true,
      job: { select: { jobType: true } },
    },
  });

  const jobRevenue = jobInvoicesList.reduce((sum, inv) => {
    const serviceTotal = parseFloat(inv.labourCost || 0) + parseFloat(inv.miscellaneousCost || 0);
    const total = parseFloat(inv.totalAmount || 0);
    const paymentRate = total > 0 ? Math.min(parseFloat(inv.amountPaid || 0) / total, 1) : 0;
    return sum + (serviceTotal * paymentRate);
  }, 0);

  const grossRevenue = counterSalesRevenue + jobRevenue;

  // 2. Calculate ACTUAL COGS (Based on SALES/USAGE, not purchases)
  // [Diagram of Accrual Accounting]
  // We calculate cost when items leave the shelf (Sales), not when they enter (Expenses)
  const salesWithItems = await req.db.sale.findMany({
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

  // Job materials are reference-only (not deducted from inventory; bought at sales counter).
  // Their cost is already captured in counter sales COGS — do not double-count here.
  const jobMaterialsCOGS = 0;
  const totalCOGS = materialCOGS;

  // 3. Calculate Gross Profit
  const grossProfit = grossRevenue - totalCOGS;

  // 4. Calculate Operational Expenses
  // --- CRITICAL FIX START ---
  // We must EXCLUDE 'materials' category here. 
  // Why? Because the cost of materials is already subtracted above in 'totalCOGS' (when sold).
  // If we subtract 'materials' purchases here too, we are double-counting the cost.
  const operationalExpenses = await req.db.expense.aggregate({
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
  const sales = await req.db.sale.findMany({
    where: { status: 'completed', saleDate: dateRange },
    include: { items: true },
  });

  let materialSalesRevenue = 0;
  let boothSalesRevenue = 0;
  let materialSalesCOGS = 0;

  sales.forEach(sale => {
    const paymentRate = parseFloat(sale.totalAmount) > 0
      ? Math.min(parseFloat(sale.amountPaid) / parseFloat(sale.totalAmount), 1)
      : 0;
    sale.items.forEach(item => {
      if (item.itemType === 'material') {
        materialSalesRevenue += parseFloat(item.subtotal || 0) * paymentRate;
        const itemCOGS = parseFloat(item.unitCost || 0) * parseFloat(item.quantity || 0);
        materialSalesCOGS += itemCOGS; // COGS unchanged — inventory left the shelf regardless of payment
      } else if (item.itemType === 'booth') {
        boothSalesRevenue += parseFloat(item.subtotal || 0) * paymentRate;
      }
    });
  });

  // 7. Job revenue breakdown by type — reuse jobInvoicesList, same service revenue formula
  const jobRevenueByType = { mechanic: 0, sprayer: 0, bodyworks: 0 };
  jobInvoicesList.forEach(inv => {
    const type = inv.job.jobType;
    if (jobRevenueByType[type] !== undefined) {
      const serviceTotal = parseFloat(inv.labourCost || 0) + parseFloat(inv.miscellaneousCost || 0);
      const total = parseFloat(inv.totalAmount || 0);
      const paymentRate = total > 0 ? Math.min(parseFloat(inv.amountPaid || 0) / total, 1) : 0;
      jobRevenueByType[type] += serviceTotal * paymentRate;
    }
  });

  // 8. Get operational expenses by category (Existing logic with FIX)
  const operationalByCategory = await req.db.expense.groupBy({
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
  // Job gross profit = all service revenue (labour+misc are pure service, no material COGS)
  const jobGrossProfit = jobRevenue;
  const jobGrossProfitMargin = jobRevenue > 0 ? 100 : 0;

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
  const counterSales = await req.db.sale.findMany({
    where: {
      status: 'completed',
      saleDate: dateRange,
    },
    include: { items: true },
  });

  let materialRevenue = 0;
  let boothRevenue = 0;

  counterSales.forEach(sale => {
    const paymentRate = parseFloat(sale.totalAmount) > 0
      ? Math.min(parseFloat(sale.amountPaid) / parseFloat(sale.totalAmount), 1)
      : 0;
    sale.items.forEach(item => {
      if (item.itemType === 'material') {
        materialRevenue += parseFloat(item.subtotal) * paymentRate;
      } else if (item.itemType === 'booth') {
        boothRevenue += parseFloat(item.subtotal) * paymentRate;
      }
    });
  });

  // Job revenue by type (labour + misc only, prorated by payment rate)
  const invoices = await req.db.invoice.findMany({
    where: {
      invoiceDate: dateRange,
    },
    select: {
      labourCost: true,
      miscellaneousCost: true,
      totalAmount: true,
      amountPaid: true,
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
    const serviceTotal = parseFloat(invoice.labourCost || 0) + parseFloat(invoice.miscellaneousCost || 0);
    const total = parseFloat(invoice.totalAmount || 0);
    const paymentRate = total > 0 ? Math.min(parseFloat(invoice.amountPaid || 0) / total, 1) : 0;
    const revenue = serviceTotal * paymentRate;
    const type = invoice.job.jobType;
    if (jobRevenue[type] !== undefined) {
      jobRevenue[type] += revenue;
    }
    totalJobRevenue += revenue;
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
  const sales = await req.db.sale.findMany({
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
  const invoices = await req.db.invoice.findMany({
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
  const now = new Date();

  // --- 1. DATE RANGES ---
  // Current Month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Last Month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Yesterday
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  // --- 2. EXECUTE QUERIES ---
  const [
    // MONTHLY DATA (For Admins)
    currentSalesCount,
    currentJobCount,
    currentSalesRevenue,
    currentJobRevenue,

    // LAST MONTH DATA (For Trends)
    lastMonthSalesCount,
    lastMonthJobCount,
    lastMonthSalesRevenue,
    lastMonthJobRevenue,

    // DAILY DATA (Aggregates)
    todaySalesRev,
    todayJobsRev,
    yesterdaySalesRev,
    yesterdayJobsRev,

    // DAILY COUNTS (New: Specifically for Non-Admins)
    todaySalesCount,
    todayJobCount,

    // GLOBAL
    pendingInvoices,
    outstandingAmount,
    lowStockMaterials,
    outstandingSalesCount,
    outstandingSalesBalance,
  ] = await Promise.all([
    // Monthly
    req.db.sale.count({ where: { status: 'completed', saleDate: { gte: currentMonthStart, lte: currentMonthEnd } } }),
    req.db.invoice.count({ where: { invoiceDate: { gte: currentMonthStart, lte: currentMonthEnd } } }),
    req.db.sale.aggregate({ where: { status: 'completed', saleDate: { gte: currentMonthStart, lte: currentMonthEnd } }, _sum: { amountPaid: true } }),
    req.db.invoice.findMany({ where: { invoiceDate: { gte: currentMonthStart, lte: currentMonthEnd } }, select: { labourCost: true, miscellaneousCost: true, totalAmount: true, amountPaid: true } }),

    // Last Month
    req.db.sale.count({ where: { status: 'completed', saleDate: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    req.db.invoice.count({ where: { invoiceDate: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    req.db.sale.aggregate({ where: { status: 'completed', saleDate: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { amountPaid: true } }),
    req.db.invoice.findMany({ where: { invoiceDate: { gte: lastMonthStart, lte: lastMonthEnd } }, select: { labourCost: true, miscellaneousCost: true, totalAmount: true, amountPaid: true } }),

    // Daily Revenue Sums
    req.db.sale.aggregate({ where: { status: 'completed', saleDate: { gte: todayStart, lte: todayEnd } }, _sum: { amountPaid: true } }),
    req.db.invoice.findMany({ where: { invoiceDate: { gte: todayStart, lte: todayEnd } }, select: { labourCost: true, miscellaneousCost: true, totalAmount: true, amountPaid: true } }),
    req.db.sale.aggregate({ where: { status: 'completed', saleDate: { gte: yesterdayStart, lte: yesterdayEnd } }, _sum: { amountPaid: true } }),
    req.db.invoice.findMany({ where: { invoiceDate: { gte: yesterdayStart, lte: yesterdayEnd } }, select: { labourCost: true, miscellaneousCost: true, totalAmount: true, amountPaid: true } }),

    // Daily Counts (New)
    req.db.sale.count({ where: { status: 'completed', saleDate: { gte: todayStart, lte: todayEnd } } }),
    req.db.invoice.count({ where: { invoiceDate: { gte: todayStart, lte: todayEnd } } }),

    // Global
    req.db.invoice.count({ where: { paymentStatus: { in: ['unpaid', 'partial'] } } }),
    req.db.invoice.aggregate({ where: { paymentStatus: { in: ['unpaid', 'partial'] } }, _sum: { amountDue: true } }),
    req.db.material.count({ where: { isActive: true, quantity: { lte: req.db.material.fields.lowStockThreshold } } }),
    req.db.sale.count({ where: { status: 'completed', balance: { gt: 0.01 } } }),
    req.db.sale.aggregate({ where: { status: 'completed', balance: { gt: 0.01 } }, _sum: { balance: true } }),
  ]);

  // --- 3. CALCULATE ---

  // Monthly Values
  const valSalesRev = parseFloat(currentSalesRevenue._sum.amountPaid || 0);
  const valJobRev = calcJobRevenue(currentJobRevenue);
  const valTotalRev = valSalesRev + valJobRev;

  // Daily Values
  const valTodaySales = parseFloat(todaySalesRev._sum.amountPaid || 0);
  const valTodayJobs = calcJobRevenue(todayJobsRev);
  const valDailyTotal = valTodaySales + valTodayJobs;

  const valYesterday = parseFloat(yesterdaySalesRev._sum.amountPaid || 0) + calcJobRevenue(yesterdayJobsRev);

  // Trends
  const trends = {
    salesCount: calculateTrend(currentSalesCount, lastMonthSalesCount),
    salesRev: calculateTrend(valSalesRev, parseFloat(lastMonthSalesRevenue._sum.amountPaid || 0)),
    jobCount: calculateTrend(currentJobCount, lastMonthJobCount),
    jobRev: calculateTrend(valJobRev, calcJobRevenue(lastMonthJobRevenue)),
    dailyRev: calculateTrend(valDailyTotal, valYesterday)
  };

  res.status(200).json({
    success: true,
    data: {
      period: {
        startDate: currentMonthStart,
        endDate: currentMonthEnd,
      },
      // NEW OBJECT: Specifically for Non-Admin Daily View
      dailyOverview: {
        totalRevenue: valDailyTotal,
        salesCount: todaySalesCount,
        salesRevenue: valTodaySales,
        jobCount: todayJobCount,
        jobRevenue: valTodayJobs,
      },
      // Existing Monthly Data (For Admins)
      dailyRevenue: {
        amount: valDailyTotal,
        trend: trends.dailyRev 
      },
      sales: {
        count: currentSalesCount,
        countTrend: trends.salesCount,
        revenue: valSalesRev,
        revenueTrend: trends.salesRev
      },
      jobs: {
        count: currentJobCount,
        countTrend: trends.jobCount,
        revenue: valJobRev,
        revenueTrend: trends.jobRev
      },
      totalRevenue: valTotalRev,
      outstanding: {
        count: pendingInvoices + outstandingSalesCount,
        amount: parseFloat(outstandingAmount._sum.amountDue || 0) + parseFloat(outstandingSalesBalance._sum.balance || 0),
      },
      alerts: {
        lowStockMaterials,
      },
    },
  });
});


// @desc    Get Trends Data for Charts
// @route   GET /api/reports/trends
// @access  Private (requires 'reports:view' permission)
export const getTrends = asyncHandler(async (req, res) => {
  const { periods = 6, unit = 'month' } = req.query;
  const numPeriods = parseInt(periods);
  const now = new Date();

  // Build array of period ranges
  const ranges = [];
  for (let i = numPeriods - 1; i >= 0; i--) {
    let start, end, label;

    if (unit === 'month') {
      start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      label = format(start, 'MMM yyyy');
    } else if (unit === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      start = weekStart;
      end = weekEnd;
      label = `W${format(start, 'w MMM')}`;
    }

    ranges.push({ start, end, label });
  }

  // Run all period queries in parallel
  const periodData = await Promise.all(
    ranges.map(async ({ start, end, label }) => {
      const dateFilter = { gte: start, lte: end };

      const [salesRev, jobInvoices, salesCount, expensesAgg, plData] = await Promise.all([
        req.db.sale.aggregate({
          where: { status: 'completed', saleDate: dateFilter },
          _sum: { amountPaid: true },
          _count: true,
        }),
        req.db.invoice.findMany({
          where: { invoiceDate: dateFilter },
          select: { labourCost: true, miscellaneousCost: true, totalAmount: true, amountPaid: true },
        }),
        req.db.sale.count({
          where: { status: 'completed', saleDate: dateFilter },
        }),
        req.db.expense.aggregate({
          where: {
            expenseDate: dateFilter,
            type: 'operational',
            category: { not: 'materials' },
          },
          _sum: { amount: true },
        }),
        // COGS via sales items
        req.db.saleItem.findMany({
          where: {
            sale: { status: 'completed', saleDate: dateFilter },
            itemType: 'material',
          },
          select: { unitCost: true, quantity: true },
        }),
      ]);

      const salesRevenue = parseFloat(salesRev._sum.amountPaid || 0);
      const jobsRevenue = calcJobRevenue(jobInvoices);
      const totalRevenue = salesRevenue + jobsRevenue;
      const expenses = parseFloat(expensesAgg._sum.amount || 0);
      const cogs = plData.reduce((sum, item) =>
        sum + (parseFloat(item.unitCost || 0) * parseFloat(item.quantity || 0)), 0
      );
      const netProfit = totalRevenue - cogs - expenses;

      return {
        label,
        revenue: totalRevenue,
        salesRevenue,
        jobsRevenue,
        expenses,
        netProfit,
        salesCount: salesRev._count,
      };
    })
  );

  res.status(200).json({ success: true, data: periodData });
});