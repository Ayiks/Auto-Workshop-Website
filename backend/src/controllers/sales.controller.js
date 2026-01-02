import { prisma } from '../server.js';
import { AppError } from '../middleware/errorHandler.js';

// @desc    Create new sale
// @route   POST /api/sales
// @access  Private (Admin, Sales)
export const createSale = async (req, res, next) => {
  try {
    const { items, paymentMethod = 'cash' } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('At least one item is required', 400, 'VALIDATION_ERROR');
    }

    // Validate payment method
    if (!['cash', 'momo', 'cheque'].includes(paymentMethod)) {
      throw new AppError('Invalid payment method', 400, 'VALIDATION_ERROR');
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      let totalProfit = 0;
      const saleItems = [];
      const updatedStock = [];

      // Process each item
      for (const item of items) {
        const { materialId, quantity } = item;

        if (!materialId || !quantity || quantity <= 0) {
          throw new AppError('Invalid item data', 400, 'VALIDATION_ERROR');
        }

        // Get material and lock row
        const material = await tx.material.findUnique({
          where: { id: parseInt(materialId) },
        });

        if (!material) {
          throw new AppError(`Material with ID ${materialId} not found`, 404, 'RESOURCE_NOT_FOUND');
        }

        if (!material.isActive) {
          throw new AppError(`Material "${material.name}" is not active`, 400, 'VALIDATION_ERROR');
        }

        // Check stock
        if (material.quantity < parseInt(quantity)) {
          throw new AppError(
            `Insufficient stock for "${material.name}". Available: ${material.quantity}, Requested: ${quantity}`,
            400,
            'INSUFFICIENT_STOCK'
          );
        }

        // Calculate amounts
        const itemQuantity = parseInt(quantity);
        const unitPrice = parseFloat(material.sellingPrice);
        const costPrice = parseFloat(material.costPrice);
        const subtotal = unitPrice * itemQuantity;
        const profit = (unitPrice - costPrice) * itemQuantity;

        totalAmount += subtotal;
        totalProfit += profit;

        // Update stock
        await tx.material.update({
          where: { id: material.id },
          data: {
            quantity: material.quantity - itemQuantity,
          },
        });

        saleItems.push({
          materialId: material.id,
          materialName: material.name,
          quantity: itemQuantity,
          unitPrice,
          costPrice,
          subtotal,
          profit,
        });

        updatedStock.push({
          materialId: material.id,
          newQuantity: material.quantity - itemQuantity,
        });
      }

      // Create sale record
      const sale = await tx.sale.create({
        data: {
          totalAmount,
          totalProfit,
          paymentMethod,
          soldById: req.user.id,
          items: {
            create: saleItems.map(item => ({
              materialId: item.materialId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice,
              subtotal: item.subtotal,
              profit: item.profit,
            })),
          },
        },
        include: {
          items: {
            include: {
              material: {
                select: {
                  name: true,
                },
              },
            },
          },
          soldBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });

      return {
        sale,
        updatedStock,
        saleItems,
      };
    });

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      sale: {
        id: result.sale.id,
        saleDate: result.sale.saleDate,
        totalAmount: result.sale.totalAmount,
        totalProfit: result.sale.totalProfit,
        items: result.saleItems,
      },
      updatedStock: result.updatedStock,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private (Admin)
export const getAllSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    const where = {};

    // Date filtering
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.saleDate.lte = end;
      }
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { saleDate: 'desc' },
        include: {
          soldBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
          items: {
            include: {
              material: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      sales,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Private (Admin)
export const getSale = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(id) },
      include: {
        soldBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        items: {
          include: {
            material: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new AppError('Sale not found', 404, 'RESOURCE_NOT_FOUND');
    }

    res.json({
      success: true,
      sale,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get daily sales report
// @route   GET /api/sales/reports/daily
// @access  Private (Admin)
export const getDailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    // Set to start of day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Set to end of day
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get ALL material sales (counter + job inventory materials)
    const allMaterialSales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: {
          include: {
            material: {
              select: {
                name: true,
              },
            },
          },
        },
        soldBy: {
          select: {
            fullName: true,
            username: true,
          },
        },
      },
    });

    // Get paid invoices for job analysis
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        paymentStatus: 'paid',
        paidDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        job: {
          include: {
            materials: true,
            mechanic: {
              select: {
                fullName: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Separate counter sales from job sales
    // Note: Labour material has name "Labour/Workmanship"
    const counterSales = [];
    const jobMaterialSales = [];

    for (const sale of allMaterialSales) {
      // Check if this sale has Labour/Workmanship (indicates it's from a job)
      const hasLabour = sale.items.some(item => item.material.name === 'Labour/Workmanship');
      
      if (hasLabour) {
        // This is from a job - separate materials and labour
        const materials = sale.items.filter(item => item.material.name !== 'Labour/Workmanship');
        const labour = sale.items.find(item => item.material.name === 'Labour/Workmanship');
        
        if (materials.length > 0) {
          jobMaterialSales.push({
            ...sale,
            items: materials,
            totalAmount: materials.reduce((sum, item) => sum + parseFloat(item.subtotal), 0),
            totalProfit: materials.reduce((sum, item) => sum + parseFloat(item.profit), 0),
          });
        }
      } else {
        // Regular counter sale
        counterSales.push(sale);
      }
    }

    // Calculate material sales summary (counter + job materials)
    const allMaterialsTotal = allMaterialSales.reduce((sum, sale) => {
      // Exclude labour from totals
      const nonLabourTotal = sale.items
        .filter(item => item.material.name !== 'Labour/Workmanship')
        .reduce((itemSum, item) => itemSum + parseFloat(item.subtotal), 0);
      return sum + nonLabourTotal;
    }, 0);

    const allMaterialsProfit = allMaterialSales.reduce((sum, sale) => {
      // Exclude labour from profit
      const nonLabourProfit = sale.items
        .filter(item => item.material.name !== 'Labour/Workmanship')
        .reduce((itemSum, item) => itemSum + parseFloat(item.profit), 0);
      return sum + nonLabourProfit;
    }, 0);

    const materialSalesSummary = {
      transactionCount: allMaterialSales.length,
      counterSalesCount: counterSales.length,
      jobMaterialsCount: jobMaterialSales.length,
      totalSales: allMaterialsTotal,
      totalProfit: allMaterialsProfit,
      breakdown: {
        fromCounter: counterSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0),
        fromJobs: jobMaterialSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0),
      },
    };

    // Calculate job sales summary (labour + external materials for display)
    let totalLabourRevenue = 0;
    let totalLabourProfit = 0;
    let totalExternalMaterials = 0;

    for (const invoice of paidInvoices) {
      // Labour revenue (from invoice)
      totalLabourRevenue += parseFloat(invoice.labourCost);
      totalLabourProfit += parseFloat(invoice.labourCost); // 100% profit

      // External materials (for display only - not counted in revenue)
      const externalMaterialsCost = invoice.job.materials
        .filter(m => !m.materialId) // Manual/external materials
        .reduce((sum, m) => sum + parseFloat(m.subtotal), 0);
      
      totalExternalMaterials += externalMaterialsCost;
    }

    const jobSalesSummary = {
      transactionCount: paidInvoices.length,
      labourRevenue: totalLabourRevenue,
      labourProfit: totalLabourProfit,
      externalMaterialsTotal: totalExternalMaterials, // Display only
    };

    // Calculate expenses summary
    const expensesSummary = {
      transactionCount: expenses.length,
      totalExpenses: expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0),
      byCategory: expenses.reduce((acc, exp) => {
        if (!acc[exp.category]) {
          acc[exp.category] = 0;
        }
        acc[exp.category] += parseFloat(exp.amount);
        return acc;
      }, {}),
    };

    // Calculate overall summary
    // IMPORTANT: totalRevenue excludes external materials
    const totalRevenue = materialSalesSummary.totalSales + jobSalesSummary.labourRevenue;
    const grossProfit = materialSalesSummary.totalProfit + jobSalesSummary.labourProfit;
    const netProfit = grossProfit - expensesSummary.totalExpenses;

    const summary = {
      date: targetDate.toISOString().split('T')[0],
      materialSales: materialSalesSummary,
      jobSales: jobSalesSummary,
      totalRevenue, // Materials + Labour only (no external)
      grossProfit,
      expenses: expensesSummary,
      netProfit,
      note: 'External materials shown on invoices but excluded from revenue (money does not come to us)',
    };

    res.json({
      success: true,
      summary,
      materialSales: allMaterialSales,
      counterSales,
      jobMaterialSales,
      jobSales: paidInvoices,
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get weekly sales report
// @route   GET /api/sales/reports/weekly
// @access  Private (Admin)
export const getWeeklyReport = async (req, res, next) => {
  try {
    const { startDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    
    // Get start of week (Monday)
    const dayOfWeek = start.getDay();
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(start.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    
    // Get end of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Get all material sales
    const allMaterialSales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        items: {
          include: {
            material: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Get paid invoices
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        paymentStatus: 'paid',
        paidDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        job: {
          include: {
            materials: true,
          },
        },
      },
    });

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });

    // Calculate material sales (exclude labour)
    const materialSalesTotal = allMaterialSales.reduce((sum, sale) => {
      const nonLabourTotal = sale.items
        .filter(item => item.material.name !== 'Labour/Workmanship')
        .reduce((itemSum, item) => itemSum + parseFloat(item.subtotal), 0);
      return sum + nonLabourTotal;
    }, 0);

    const materialProfitTotal = allMaterialSales.reduce((sum, sale) => {
      const nonLabourProfit = sale.items
        .filter(item => item.material.name !== 'Labour/Workmanship')
        .reduce((itemSum, item) => itemSum + parseFloat(item.profit), 0);
      return sum + nonLabourProfit;
    }, 0);

    // Calculate job sales (labour only for revenue)
    const labourTotal = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.labourCost), 0);
    const externalMaterialsTotal = paidInvoices.reduce((sum, inv) => {
      const external = inv.job.materials
        .filter(m => !m.materialId)
        .reduce((s, m) => s + parseFloat(m.subtotal), 0);
      return sum + external;
    }, 0);

    const expensesTotal = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    // Total revenue = materials + labour (NO external)
    const totalRevenue = materialSalesTotal + labourTotal;
    const grossProfit = materialProfitTotal + labourTotal;
    const netProfit = grossProfit - expensesTotal;

    const summary = {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      materialSales: {
        transactionCount: allMaterialSales.length,
        totalSales: materialSalesTotal,
        totalProfit: materialProfitTotal,
      },
      jobSales: {
        transactionCount: paidInvoices.length,
        labourRevenue: labourTotal,
        labourProfit: labourTotal,
        externalMaterialsTotal, // Display only
      },
      totalRevenue,
      grossProfit,
      totalExpenses: expensesTotal,
      netProfit,
    };

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly sales report
// @route   GET /api/sales/reports/monthly
// @access  Private (Admin)
export const getMonthlyReport = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    
    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // Get all material sales
    const allMaterialSales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        items: {
          include: {
            material: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Get paid invoices
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        paymentStatus: 'paid',
        paidDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        job: {
          include: {
            materials: true,
          },
        },
      },
    });

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Calculate material sales (exclude labour)
    const materialSalesTotal = allMaterialSales.reduce((sum, sale) => {
      const nonLabourTotal = sale.items
        .filter(item => item.material.name !== 'Labour/Workmanship')
        .reduce((itemSum, item) => itemSum + parseFloat(item.subtotal), 0);
      return sum + nonLabourTotal;
    }, 0);

    const materialProfitTotal = allMaterialSales.reduce((sum, sale) => {
      const nonLabourProfit = sale.items
        .filter(item => item.material.name !== 'Labour/Workmanship')
        .reduce((itemSum, item) => itemSum + parseFloat(item.profit), 0);
      return sum + nonLabourProfit;
    }, 0);

    // Calculate job sales (labour only for revenue)
    const labourTotal = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.labourCost), 0);
    const externalMaterialsTotal = paidInvoices.reduce((sum, inv) => {
      const external = inv.job.materials
        .filter(m => !m.materialId)
        .reduce((s, m) => s + parseFloat(m.subtotal), 0);
      return sum + external;
    }, 0);

    const expensesTotal = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    // Total revenue = materials + labour (NO external)
    const totalRevenue = materialSalesTotal + labourTotal;
    const grossProfit = materialProfitTotal + labourTotal;
    const netProfit = grossProfit - expensesTotal;

    const summary = {
      year: targetYear,
      month: targetMonth + 1,
      monthName: monthStart.toLocaleString('default', { month: 'long' }),
      materialSales: {
        transactionCount: allMaterialSales.length,
        totalSales: materialSalesTotal,
        totalProfit: materialProfitTotal,
      },
      jobSales: {
        transactionCount: paidInvoices.length,
        labourRevenue: labourTotal,
        labourProfit: labourTotal,
        externalMaterialsTotal, // Display only
      },
      totalRevenue,
      grossProfit,
      totalExpenses: expensesTotal,
      netProfit,
    };

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    next(error);
  }
};