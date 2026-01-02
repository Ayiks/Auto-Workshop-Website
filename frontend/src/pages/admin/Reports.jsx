import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { format, differenceInDays } from 'date-fns';

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchReport = async () => {
    try {
      setLoading(true);
      
      // Use daily report endpoint with date range
      const response = await api.get(`/sales/reports/daily?date=${dateRange.startDate}`);
      
      // If date range spans multiple days, we need to fetch and aggregate
      const daysDiff = differenceInDays(new Date(dateRange.endDate), new Date(dateRange.startDate));
      
      if (daysDiff > 0) {
        // Fetch range data
        const allDays = [];
        for (let i = 0; i <= daysDiff; i++) {
          const currentDate = new Date(dateRange.startDate);
          currentDate.setDate(currentDate.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];
          const dayResponse = await api.get(`/sales/reports/daily?date=${dateStr}`);
          allDays.push(dayResponse);
        }
        
        // Aggregate the data
        const aggregated = aggregateReports(allDays);
        setReport(aggregated);
      } else {
        // Single day
        setReport(response);
      }
      
      setActiveTab('overview');
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const aggregateReports = (reports) => {
    const allMaterialSales = [];
    const allCounterSales = [];
    const allJobMaterialSales = [];
    const allJobSales = [];
    const allExpenses = [];
    
    let totalMaterialSales = 0;
    let totalMaterialProfit = 0;
    let counterSalesTotal = 0;
    let jobMaterialsTotal = 0;
    let totalLabourRevenue = 0;
    let totalLabourProfit = 0;
    let totalExternalMaterials = 0;
    let totalExpensesAmount = 0;
    const expensesByCategory = {};

    reports.forEach(report => {
      // Material sales
      if (report.materialSales) {
        allMaterialSales.push(...report.materialSales);
        totalMaterialSales += parseFloat(report.summary?.materialSales?.totalSales || 0);
        totalMaterialProfit += parseFloat(report.summary?.materialSales?.totalProfit || 0);
        counterSalesTotal += parseFloat(report.summary?.materialSales?.breakdown?.fromCounter || 0);
        jobMaterialsTotal += parseFloat(report.summary?.materialSales?.breakdown?.fromJobs || 0);
      }
      
      if (report.counterSales) allCounterSales.push(...report.counterSales);
      if (report.jobMaterialSales) allJobMaterialSales.push(...report.jobMaterialSales);
      
      // Job sales
      if (report.jobSales) {
        allJobSales.push(...report.jobSales);
        totalLabourRevenue += parseFloat(report.summary?.jobSales?.labourRevenue || 0);
        totalLabourProfit += parseFloat(report.summary?.jobSales?.labourProfit || 0);
        totalExternalMaterials += parseFloat(report.summary?.jobSales?.externalMaterialsTotal || 0);
      }
      
      // Expenses
      if (report.expenses) {
        allExpenses.push(...report.expenses);
        totalExpensesAmount += parseFloat(report.summary?.expenses?.totalExpenses || 0);
        
        const categoryBreakdown = report.summary?.expenses?.byCategory || {};
        Object.entries(categoryBreakdown).forEach(([cat, amt]) => {
          expensesByCategory[cat] = (expensesByCategory[cat] || 0) + parseFloat(amt);
        });
      }
    });

    const totalRevenue = totalMaterialSales + totalLabourRevenue;
    const grossProfit = totalMaterialProfit + totalLabourProfit;
    const netProfit = grossProfit - totalExpensesAmount;

    return {
      summary: {
        dateRange: `${dateRange.startDate} to ${dateRange.endDate}`,
        materialSales: {
          transactionCount: allMaterialSales.length,
          counterSalesCount: allCounterSales.length,
          jobMaterialsCount: allJobMaterialSales.length,
          totalSales: totalMaterialSales,
          totalProfit: totalMaterialProfit,
          breakdown: {
            fromCounter: counterSalesTotal,
            fromJobs: jobMaterialsTotal,
          },
        },
        jobSales: {
          transactionCount: allJobSales.length,
          labourRevenue: totalLabourRevenue,
          labourProfit: totalLabourProfit,
          externalMaterialsTotal: totalExternalMaterials,
        },
        totalRevenue,
        grossProfit,
        expenses: {
          transactionCount: allExpenses.length,
          totalExpenses: totalExpensesAmount,
          byCategory: expensesByCategory,
        },
        netProfit,
      },
      materialSales: allMaterialSales,
      counterSales: allCounterSales,
      jobMaterialSales: allJobMaterialSales,
      jobSales: allJobSales,
      expenses: allExpenses,
    };
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const handleQuickSelect = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const daysDiff = differenceInDays(new Date(dateRange.endDate), new Date(dateRange.startDate));
  const dateRangeText = daysDiff === 0 
    ? format(new Date(dateRange.startDate), 'MMMM dd, yyyy')
    : `${format(new Date(dateRange.startDate), 'MMM dd, yyyy')} - ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
            <p className="text-gray-600 mt-1">View financial performance by date range</p>
          </div>
          {report && (
            <button onClick={handlePrint} className="btn-secondary">
              🖨️ Print Report
            </button>
          )}
        </div>

        {/* Date Range Selector */}
        <div className="card print:hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Date Range</h3>
          
          {/* Quick Select Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleQuickSelect(0)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Today
            </button>
            <button
              onClick={() => handleQuickSelect(6)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleQuickSelect(29)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleQuickSelect(89)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Last 90 Days
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                max={dateRange.endDate}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                min={dateRange.startDate}
                max={new Date().toISOString().split('T')[0]}
                className="input"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="w-full btn-primary btn-touch"
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {dateRange.startDate && dateRange.endDate && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                📅 Report Period: <strong>{dateRangeText}</strong> ({daysDiff + 1} day{daysDiff !== 0 ? 's' : ''})
              </p>
            </div>
          )}
        </div>

        {/* Report Display */}
        {report && (
          <div className="space-y-6">
            {/* Report Header - Print Only */}
            <div className="hidden print:block text-center mb-6">
              <h1 className="text-2xl font-bold">Auto Workshop</h1>
              <p className="text-gray-600 mt-1">Sales Report</p>
              <p className="text-sm text-gray-500 mt-1">{dateRangeText}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card bg-blue-50 border-2 border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  GH₵ {parseFloat(report.summary?.totalRevenue || 0).toFixed(2)}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Materials + Labour
                </p>
              </div>

              <div className="card bg-green-50 border-2 border-green-200">
                <p className="text-sm text-green-600 font-medium">Gross Profit</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  GH₵ {parseFloat(report.summary?.grossProfit || 0).toFixed(2)}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Before expenses
                </p>
              </div>

              <div className="card bg-red-50 border-2 border-red-200">
                <p className="text-sm text-red-600 font-medium">Total Expenses</p>
                <p className="text-3xl font-bold text-red-900 mt-2">
                  GH₵ {parseFloat(report.summary?.expenses?.totalExpenses || 0).toFixed(2)}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {report.summary?.expenses?.transactionCount || 0} transactions
                </p>
              </div>

              <div className={`card border-2 ${
                (report.summary?.netProfit || 0) >= 0 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <p className={`text-sm font-medium ${
                  (report.summary?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-orange-600'
                }`}>
                  Net Profit
                </p>
                <p className={`text-3xl font-bold mt-2 ${
                  (report.summary?.netProfit || 0) >= 0 ? 'text-emerald-900' : 'text-orange-900'
                }`}>
                  GH₵ {parseFloat(report.summary?.netProfit || 0).toFixed(2)}
                </p>
                <p className={`text-xs mt-1 ${
                  (report.summary?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-orange-700'
                }`}>
                  After all expenses
                </p>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Material Sales */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-blue-900">Material Sales</h4>
                    <span className="text-2xl">🛒</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">Transactions:</span>
                      <span className="font-medium text-blue-900">
                        {report.summary?.materialSales?.transactionCount || 0}
                      </span>
                    </div>
                    {report.summary?.materialSales?.breakdown && (
                      <>
                        <div className="flex justify-between text-xs text-blue-600">
                          <span>From Counter:</span>
                          <span>GH₵ {parseFloat(report.summary.materialSales.breakdown.fromCounter).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-blue-600">
                          <span>From Jobs:</span>
                          <span>GH₵ {parseFloat(report.summary.materialSales.breakdown.fromJobs).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-sm pt-2 border-t border-blue-300">
                      <span className="text-blue-700">Revenue:</span>
                      <span className="font-bold text-blue-900">
                        GH₵ {parseFloat(report.summary?.materialSales?.totalSales || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">Profit:</span>
                      <span className="font-medium text-green-600">
                        GH₵ {parseFloat(report.summary?.materialSales?.totalProfit || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Job Sales */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-purple-900">Job Sales (Labour)</h4>
                    <span className="text-2xl">🔧</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-700">Transactions:</span>
                      <span className="font-medium text-purple-900">
                        {report.summary?.jobSales?.transactionCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-700">Labour Revenue:</span>
                      <span className="font-bold text-purple-900">
                        GH₵ {parseFloat(report.summary?.jobSales?.labourRevenue || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-700">Labour Profit:</span>
                      <span className="font-medium text-green-600">
                        GH₵ {parseFloat(report.summary?.jobSales?.labourProfit || 0).toFixed(2)}
                      </span>
                    </div>
                    {report.summary?.jobSales?.externalMaterialsTotal > 0 && (
                      <div className="pt-2 border-t border-purple-300">
                        <div className="flex justify-between text-xs text-purple-600">
                          <span>External Materials:</span>
                          <span>GH₵ {parseFloat(report.summary.jobSales.externalMaterialsTotal).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-purple-500 mt-1 italic">
                          (Not counted in revenue)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Important Note */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Total Revenue includes all material sales (counter + job inventory) and labour charges. 
                  External materials appear on invoices but are excluded from revenue since that money doesn't come to us.
                </p>
              </div>
            </div>

            {/* Tabs for Detailed Breakdown */}
            {report.materialSales && (
              <div className="card print:hidden">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'overview'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('materials')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'materials'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      All Materials ({report.materialSales?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'jobs'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Job Invoices ({report.jobSales?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('expenses')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'expenses'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Expenses ({report.expenses?.length || 0})
                    </button>
                  </nav>
                </div>

                <div className="mt-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="text-6xl mb-4">📊</div>
                        <p className="text-gray-600">
                          Select a tab above to view detailed breakdown
                        </p>
                      </div>

                      {/* Quick Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Counter Sales</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {report.counterSales?.length || 0}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Job Material Sales</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {report.jobMaterialSales?.length || 0}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Completed Jobs</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {report.jobSales?.length || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Materials Tab */}
                  {activeTab === 'materials' && (
                    <div className="overflow-x-auto">
                      {report.materialSales && report.materialSales.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Date/Time
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Type
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Items
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Payment
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Profit
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {report.materialSales.map((sale) => {
                              const hasLabour = sale.items?.some(i => i.material?.name === 'Labour/Workmanship');
                              const nonLabourItems = sale.items?.filter(i => i.material?.name !== 'Labour/Workmanship') || [];
                              const nonLabourTotal = nonLabourItems.reduce((s, i) => s + parseFloat(i.subtotal), 0);
                              const nonLabourProfit = nonLabourItems.reduce((s, i) => s + parseFloat(i.profit), 0);

                              return (
                                <tr key={sale.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    {format(new Date(sale.saleDate), 'MMM dd, HH:mm')}
                                  </td>
                                  <td className="px-6 py-4 text-sm">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      hasLabour 
                                        ? 'bg-purple-100 text-purple-800' 
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {hasLabour ? 'From Job' : 'Counter'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    {nonLabourItems.length}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600">
                                    {sale.paymentMethod?.toUpperCase() || 'CASH'}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    GH₵ {nonLabourTotal.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-medium text-green-600">
                                    GH₵ {nonLabourProfit.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-center text-gray-500 py-8">No material sales in this period</p>
                      )}
                    </div>
                  )}

                  {/* Jobs Tab */}
                  {activeTab === 'jobs' && (
                    <div className="overflow-x-auto">
                      {report.jobSales && report.jobSales.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Invoice #
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Client
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Materials
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Labour
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {report.jobSales.map((invoice) => (
                              <tr key={invoice.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {invoice.paidDate && format(new Date(invoice.paidDate), 'MMM dd, HH:mm')}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-primary-600">
                                  {invoice.invoiceNumber}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {invoice.job?.clientName || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  GH₵ {parseFloat(invoice.materialsCost).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-sm text-purple-600 font-medium">
                                  GH₵ {parseFloat(invoice.labourCost).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                  GH₵ {parseFloat(invoice.totalAmount).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-center text-gray-500 py-8">No job sales in this period</p>
                      )}
                    </div>
                  )}

                  {/* Expenses Tab */}
                  {activeTab === 'expenses' && (
                    <div className="space-y-4">
                      {report.expenses && report.expenses.length > 0 ? (
                        <>
                          {/* Expenses by Category */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                            {Object.entries(report.summary?.expenses?.byCategory || {}).map(([category, amount]) => (
                              <div key={category} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-600 capitalize">{category}</p>
                                  <p className="text-xl font-bold text-gray-900 mt-1">
                                  GH₵ {parseFloat(amount).toFixed(2)}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Expenses Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Date
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Category
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Description
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Amount
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {report.expenses.map((expense) => (
                                  <tr key={expense.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {expense.date && format(new Date(expense.date), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                                      {expense.category || 'Misc'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                      {expense.description || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-red-700">
                                      GH₵ {parseFloat(expense.amount).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <p className="text-center text-gray-500 py-8">No expenses recorded in this period</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Note for Print */}
            <div className="text-center mt-8 text-sm text-gray-500 print:block hidden">
              <p>Generated on {format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
              <p>Auto Workshop Management System</p>
            </div>
          </div>
        )}

        {!report && (
          <div className="card text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Report Generated</h3>
            <p className="text-gray-600">
              Select a date range and click <strong>Generate Report</strong> to view financial insights.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}