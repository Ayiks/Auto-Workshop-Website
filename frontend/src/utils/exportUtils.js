// src/utils/exportUtils.js

/**
 * Convert data to CSV format and trigger download
 */
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export sales report to CSV
 */
export const exportSalesReport = (sales, dateRange) => {
  const data = [
    { metric: 'Total Sales', value: sales.totalSales || 0 },
    { metric: 'Total Revenue', value: `GH₵${Number(sales.totalRevenue || 0).toLocaleString()}` },
    { metric: 'Average Sale', value: `GH₵${Number(sales.averageSale || 0).toFixed(2)}` },
    { metric: 'Material Sales', value: sales.materialSales || 0 },
    { metric: 'Material Revenue', value: `GH₵${Number(sales.materialRevenue || 0).toLocaleString()}` },
    { metric: 'Booth Sales', value: sales.boothSales || 0 },
    { metric: 'Booth Revenue', value: `GH₵${Number(sales.boothRevenue || 0).toLocaleString()}` },
  ];

  exportToCSV(data, `sales-report-${dateRange.startDate}-${dateRange.endDate}`);
};

/**
 * Export jobs report to CSV
 */
export const exportJobsReport = (jobs, dateRange) => {
  const data = [
    { metric: 'Total Jobs', value: jobs.totalJobs || 0 },
    { metric: 'Total Revenue', value: `GH₵${Number(jobs.totalRevenue || 0).toLocaleString()}` },
    { metric: 'Materials Value', value: `GH₵${Number(jobs.materialsValue || 0).toLocaleString()}` },
    { metric: 'Labour Costs', value: `GH₵${Number(jobs.labourCosts || 0).toLocaleString()}` },
    { metric: 'Unpaid Jobs', value: jobs.unpaidJobs || 0 },
    { metric: 'Unpaid Amount', value: `GH₵${Number(jobs.unpaidAmount || 0).toLocaleString()}` },
    { metric: 'Partial Jobs', value: jobs.partialJobs || 0 },
    { metric: 'Partial Amount Due', value: `GH₵${Number(jobs.partialAmount || 0).toLocaleString()}` },
    { metric: 'Paid Jobs', value: jobs.paidJobs || 0 },
    { metric: 'Paid Amount', value: `GH₵${Number(jobs.paidAmount || 0).toLocaleString()}` },
  ];

  exportToCSV(data, `jobs-report-${dateRange.startDate}-${dateRange.endDate}`);
};

/**
 * Export expenses report to CSV
 */
export const exportExpensesReport = (expenses, dateRange) => {
  const data = [
    { metric: 'Total Expenses', value: `GH₵${Number(expenses.totalExpenses || 0).toLocaleString()}` },
    { metric: 'COGS', value: `GH₵${Number(expenses.cogs || 0).toLocaleString()}` },
    { metric: 'COGS Count', value: expenses.cogsCount || 0 },
    { metric: 'Operational Expenses', value: `GH₵${Number(expenses.operational || 0).toLocaleString()}` },
    { metric: 'Operational Count', value: expenses.operationalCount || 0 },
  ];

  exportToCSV(data, `expenses-report-${dateRange.startDate}-${dateRange.endDate}`);
};

/**
 * Export P&L statement to CSV
 */
export const exportProfitLoss = (pl, dateRange) => {
  const data = [
    { category: 'REVENUE', metric: 'Materials Sales', amount: `GH₵${Number(pl.materialsSales || 0).toLocaleString()}` },
    { category: 'REVENUE', metric: 'Booth Services', amount: `GH₵${Number(pl.boothSales || 0).toLocaleString()}` },
    { category: 'REVENUE', metric: 'Jobs Revenue', amount: `GH₵${Number(pl.jobsRevenue || 0).toLocaleString()}` },
    { category: 'REVENUE', metric: 'Gross Revenue', amount: `GH₵${Number(pl.grossRevenue || 0).toLocaleString()}` },
    { category: 'COGS', metric: 'Cost of Goods Sold', amount: `GH₵${Number(pl.cogs || 0).toLocaleString()}` },
    { category: 'PROFIT', metric: 'Gross Profit', amount: `GH₵${Number(pl.grossProfit || 0).toLocaleString()}` },
    { category: 'PROFIT', metric: 'Gross Profit Margin', amount: `${pl.grossProfitMargin || 0}%` },
    { category: 'EXPENSES', metric: 'Operational Expenses', amount: `GH₵${Number(pl.operationalExpenses || 0).toLocaleString()}` },
    { category: 'PROFIT', metric: 'Net Profit', amount: `GH₵${Number(pl.netProfit || 0).toLocaleString()}` },
    { category: 'PROFIT', metric: 'Net Profit Margin', amount: `${pl.netProfitMargin || 0}%` },
  ];

  exportToCSV(data, `profit-loss-${dateRange.startDate}-${dateRange.endDate}`);
};

/**
 * Export material usage report to CSV
 */
export const exportMaterialUsage = (materials, dateRange) => {
  if (!materials || materials.length === 0) {
    alert('No material usage data to export');
    return;
  }

  const data = materials.map(m => ({
    material: m.materialName,
    'total_quantity': m.totalQuantity,
    'total_value': `GH₵${Number(m.totalValue || 0).toLocaleString()}`,
    'in_sales': m.usedInSales || 0,
    'in_jobs': m.usedInJobs || 0,
  }));

  exportToCSV(data, `material-usage-${dateRange.startDate}-${dateRange.endDate}`);
};