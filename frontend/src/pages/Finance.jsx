// src/pages/Finance.jsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@api/reports";
import { useResponsive } from "@hooks/useResponsive";
import { RESPONSIVE_SPACING } from "@utils/responsiveHelpers";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import LoadingSpinner from "@components/common/LoadingSpinner";
import ReportFilters from "@components/features/finance/ReportFilters";
import {
  exportSalesReport,
  exportJobsReport,
  exportExpensesReport,
  exportProfitLoss,
  exportMaterialUsage,
} from "@utils/exportUtils";

// Modern minimalist color palette
const COLORS = [
  "#6366F1", // Indigo
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#64748B", // Slate
];

export default function Finance() {
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [activeTab, setActiveTab] = useState("overview");

  // --- DATA FETCHING ---
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ["sales-report", dateRange],
    queryFn: () => reportsApi.getSalesReport(dateRange),
  });
  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ["jobs-report", dateRange],
    queryFn: () => reportsApi.getJobReport(dateRange),
  });
  const { data: expensesData, isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses-report", dateRange],
    queryFn: () => reportsApi.getExpenseReport(dateRange),
  });
  const { data: plData, isLoading: loadingPL } = useQuery({
    queryKey: ["pl-statement", dateRange],
    queryFn: () => reportsApi.getProfitLoss(dateRange),
  });
  const { data: revenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ["revenue-breakdown", dateRange],
    queryFn: () => reportsApi.getRevenue(dateRange),
  });
  const { data: materialUsageData, isLoading: loadingMaterialUsage } = useQuery(
    {
      queryKey: ["material-usage", dateRange],
      queryFn: () => reportsApi.getMaterialUsageReport(dateRange),
    }
  );

  // --- DATA MAPPING ---
  const sales = {
    totalSales: salesData?.data?.summary?.totalTransactions || 0,
    totalRevenue: salesData?.data?.summary?.totalSalesRevenue || 0,
    averageSale:
      (salesData?.data?.summary?.totalSalesRevenue || 0) /
      (salesData?.data?.summary?.totalTransactions || 1),
    breakdown: salesData?.data?.breakdown,
    dailyTrend: salesData?.data?.dailyTrend,
    recentSales: salesData?.data?.recentSales,
    salesByMethod: salesData?.data?.salesByMethod,
    materialSales: salesData?.data?.breakdown?.materials?.revenue || 0,
    boothSales: salesData?.data?.breakdown?.booth?.revenue || 0,
  };

  const jobs = {
    totalJobs: jobsData?.data?.summary?.totalJobs || 0,
    totalRevenue: jobsData?.data?.summary?.totalJobRevenue || 0,
    totalMaterialsCost: jobsData?.data?.summary?.totalMaterialsCost || 0,
    totalLabourCost: jobsData?.data?.summary?.totalLabourCost || 0,
    averageJob:
      (jobsData?.data?.summary?.totalJobRevenue || 0) /
      (jobsData?.data?.summary?.totalJobs || 1),
    totalOutstanding: jobsData?.data?.summary?.totalOutstanding || 0,
    totalPaid: jobsData?.data?.summary?.totalPaid || 0,
    unpaidJobs:
      jobsData?.data?.data?.paymentStatusBreakdown?.unpaid?.count || 0,
    unpaidAmount:
      jobsData?.data?.data?.paymentStatusBreakdown?.unpaid?.amount || 0,
    partialJobs:
      jobsData?.data?.data?.paymentStatusBreakdown?.partial?.count || 0,
    partialAmount:
      jobsData?.data?.data?.paymentStatusBreakdown?.partial?.amountDue || 0,
    paidJobs: jobsData?.data?.data?.paymentStatusBreakdown?.paid?.count || 0,
    paidAmount: jobsData?.data?.data?.paymentStatusBreakdown?.paid?.amount || 0,
    revenueByType: jobsData?.data?.data?.revenueByType,
    materialUsage: jobsData?.data?.data?.materialUsage,
    paymentStatusBreakdown: jobsData?.data?.data?.paymentStatusBreakdown,
    recentJobs: jobsData?.data?.data?.recentJobs,
  };

  const expenses = {
    totalExpenses: expensesData?.data?.summary?.totalExpenses || 0,
    cogTotal: expensesData?.data?.summary?.cogTotal || 0, // Purchases
    operationalTotal: expensesData?.data?.summary?.operationalTotal || 0,
    materialReorderCount:
      expensesData?.data?.summary?.materialReorderCount || 0,
    operationalCount: expensesData?.data?.summary?.operationalCount || 0,
    breakdown: expensesData?.data?.breakdown || { byCategory: [] },
    monthlyTrend: expensesData?.data?.monthlyTrend || [],
    recentExpenses: expensesData?.data?.recentExpenses || [],
    allExpenses: expensesData?.data?.allExpenses || [],
  };

  const pl = {
    grossRevenue: Number(plData?.data?.summary?.grossRevenue || 0),
    cogs: Number(plData?.data?.summary?.cogs || 0), // Usage
    grossProfit: Number(plData?.data?.summary?.grossProfit || 0),
    operationalExpenses: Number(
      plData?.data?.summary?.operationalExpenses || 0
    ),
    netProfit: Number(plData?.data?.summary?.netProfit || 0),
    grossProfitMargin: plData?.data?.summary?.grossProfitMargin || "0.00",
    netProfitMargin: plData?.data?.summary?.netProfitMargin || "0.00",
    revenue: plData?.data?.revenue,
    costs: plData?.data?.costs,
    profitability: plData?.data?.profitability,
    // Helpers for charts
    materialsSales: Number(
      plData?.data?.revenue?.counterSalesBreakdown?.materials?.revenue || 0
    ),
    boothSales: Number(
      plData?.data?.revenue?.counterSalesBreakdown?.booth?.revenue || 0
    ),
    jobsRevenue: Number(plData?.data?.revenue?.sources?.jobs || 0),
  };

  const revenue = {
    materialsSales: revenueData?.data?.sources?.materials?.amount || 0,
    materialsPercentage: revenueData?.data?.sources?.materials?.percentage || 0,
    boothSales: revenueData?.data?.sources?.booth?.amount || 0,
    boothPercentage: revenueData?.data?.sources?.booth?.percentage || 0,
    jobsRevenue: revenueData?.data?.sources?.jobs?.amount || 0,
    jobsPercentage: revenueData?.data?.sources?.jobs?.percentage || 0,
    totalRevenue: revenueData?.data?.totalRevenue || 0,
  };

  const materialUsage = {
    topMaterials: materialUsageData?.data?.topMaterials || [],
    allMaterials: materialUsageData?.data?.allMaterials || [],
    summary: materialUsageData?.data?.summary || {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
    },
  };

  const isLoading =
    loadingSales ||
    loadingJobs ||
    loadingExpenses ||
    loadingPL ||
    loadingRevenue ||
    loadingMaterialUsage;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" text="Loading financial data..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Financial Dashboard
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Complete overview and analytics for{" "}
                {format(new Date(dateRange.startDate), "MMM d")} -{" "}
                {format(new Date(dateRange.endDate), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <ReportFilters dateRange={dateRange} onDateChange={setDateRange} />
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white rounded-lg p-1 border border-gray-200 w-fit overflow-x-auto">
            {[
              { id: "overview", label: "Overview" },
              // { id: "sales", label: "Sales" },
              { id: "jobs", label: "Jobs" },
              { id: "expenses", label: "Expenses" },
              { id: "pl", label: "P&L" },
              { id: "materials", label: "Materials" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === "overview" && (
            <OverviewTab
              pl={pl}
              revenue={revenue}
              sales={sales}
              jobs={jobs}
              expenses={expenses}
            />
          )}
          {activeTab === "sales" && (
            <SalesTab sales={sales} dateRange={dateRange} />
          )}
          {activeTab === "jobs" && (
            <JobsTab jobs={jobs} dateRange={dateRange} />
          )}
          {activeTab === "expenses" && (
            <ExpensesTab expenses={expenses} dateRange={dateRange} />
          )}
          {activeTab === "pl" && <PLTab pl={pl} dateRange={dateRange} />}
          {activeTab === "materials" && (
            <MaterialUsageTab
              materialUsage={materialUsage}
              dateRange={dateRange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- OVERVIEW TAB (FIXED) ---
function OverviewTab({ pl, revenue, expenses }) {
  const [showPurchases, setShowPurchases] = useState(false);

  // 1. COGS (Usage) - From P&L
  const totalCOGS = Number(pl.cogs || 0);
  // 2. Purchases (Restock) - From Expense Report
  const totalMaterialPurchases = Number(expenses.cogTotal || 0);

  const cogsCardData = showPurchases
    ? {
        title: "Material Purchases",
        value: totalMaterialPurchases,
        label: "Inventory restock (Cash Flow)",
        tag: "EXPENSES",
        colorClass: "blue",
      }
    : {
        title: "Cost of Goods Sold",
        value: totalCOGS,
        label: "Direct material usage (P&L)",
        tag: "USAGE",
        colorClass: "amber",
      };

  // --- CHART DATA ---
  const revenueChartData = [
    { name: "Materials (Sales)", value: Number(revenue.materialsSales), color: COLORS[0] },
    { name: "Booth Services", value: Number(revenue.boothSales), color: COLORS[1] },
    { name: "Service Jobs", value: Number(revenue.jobsRevenue), color: COLORS[2] },
  ].filter((i) => i.value > 0);

  // Profitability Logic
  const boothProfit = Number(pl.boothSales || 0);
  const materialSalesProfit = Number(pl.revenue?.counterSalesBreakdown?.materials?.grossProfit || 0);
  const jobProfit = Number(pl.revenue?.jobProfitAnalysis?.grossProfit || 0);

  const profitabilityChartData = [
    { name: "Booth Profit", value: boothProfit, color: COLORS[1] },
    { name: "Material Profit (Sales)", value: materialSalesProfit, color: COLORS[0] },
    { name: "Job Profit", value: jobProfit, color: COLORS[2] },
  ].filter((i) => i.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Row 1: Key Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Revenue</span>
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">GH₵{pl.grossRevenue.toLocaleString()}</div>
          <div className="text-xs text-gray-400 font-medium mt-1">Total Income</div>
        </div>

        {/* --- DYNAMIC COGS/PURCHASE CARD --- */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors relative group">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                 {cogsCardData.title}
               </span>
               {/* THE SWITCH BUTTON */}
               <button 
                 onClick={() => setShowPurchases(!showPurchases)}
                 className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all"
                 title="Switch between Usage (COGS) and Purchases"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
               </button>
             </div>
             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${showPurchases ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                 {cogsCardData.tag}
             </span>
           </div>
           
           <div className="text-2xl font-bold text-gray-900 tracking-tight">
            GH₵{cogsCardData.value.toLocaleString()}
           </div>
           <div className="text-xs text-gray-400 font-medium mt-1">
             {cogsCardData.label}
           </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Profit</span>
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">GH₵{pl.grossProfit.toLocaleString()}</div>
          <div className="text-xs text-gray-400 font-medium mt-1">{pl.grossProfitMargin}% Margin</div>
        </div>

        {/* Operational Expenses */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Operational Exp.</span>
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">GH₵{pl.operationalExpenses.toLocaleString()}</div>
          <div className="text-xs text-gray-400 font-medium mt-1">Overhead Costs</div>
        </div>
      </div>

      {/* Row 2: Net Profit Card */}
      <div className={`bg-white rounded-xl p-5 border shadow-sm hover:border-gray-300 transition-colors ${pl.netProfit >= 0 ? 'border-gray-200' : 'border-red-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Profit</span>
          <div className={`p-2 rounded-lg border ${pl.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={pl.netProfit >= 0 ? "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
          </div>
        </div>
        <div className={`text-2xl font-bold tracking-tight ${pl.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
          GH₵{pl.netProfit.toLocaleString()}
        </div>
        <div className={`text-xs font-medium mt-1 ${pl.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {pl.netProfitMargin}% Net Margin
        </div>
      </div>

      {/* Row 3: Charts (Revenue Sources & Profitability Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Revenue Sources */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Revenue Sources
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Percentage split of Total Revenue (GH₵
            {revenue.totalRevenue.toLocaleString()})
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {revenueChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `GH₵${Number(value).toLocaleString()}`}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
            {revenueChartData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Profitability Breakdown */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Profitability Breakdown
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Contribution to Gross Profit by Source
          </p>
          
          {/* List-based Breakdown */}
          <div className="space-y-4 mb-6">
            {profitabilityChartData.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="font-medium text-gray-700">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900">GH₵{item.value.toLocaleString()}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total Gross Profit</span>
                <span className="font-bold text-xl text-indigo-700">GH₵{pl.grossProfit.toLocaleString()}</span>
            </div>
          </div>
          
          {/* Visual Bar */}
          <div className="h-6 flex rounded-full overflow-hidden">
            {profitabilityChartData.map((item, index) => {
              const percentage = (item.value / pl.grossProfit) * 100;
              return (
                <div
                  key={index}
                  style={{ width: `${percentage}%`, backgroundColor: item.color }}
                  className="h-full"
                  title={`${item.name}: ${(percentage).toFixed(1)}%`}
                ></div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpensesTab({ expenses }) {
  const data = expenses?.breakdown?.byCategory || [];
  const totalExpenses = expenses?.summary?.totalExpenses || 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">
            Total Outflow
          </div>
          <div className="text-2xl font-bold text-gray-900">
            GH₵{Number(totalExpenses).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Includes OpEx & Materials
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">
            Operational
          </div>
          <div className="text-2xl font-bold text-gray-900">
            GH₵{Number(expenses.operationalTotal || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Running costs</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">
            Material Restock
          </div>
          <div className="text-2xl font-bold text-blue-600">
            GH₵{Number(expenses.cogTotal || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Stock purchases</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Expense Breakdown
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#E2E8F0"
                />
                <XAxis
                  type="number"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickFormatter={(val) => `GH₵${val / 1000}k`}
                />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={120}
                  stroke="#475569"
                  fontSize={12}
                  style={{ textTransform: "capitalize" }}
                />
                <Tooltip
                  cursor={{ fill: "#F1F5F9" }}
                  formatter={(val) => `GH₵${Number(val).toLocaleString()}`}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.category === "Material Purchases"
                          ? "#3B82F6"
                          : COLORS[index % COLORS.length]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed List */}
        <div className="bg-white rounded-xl border border-gray-200 p-0 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Spending Details</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        item.category === "Material Purchases"
                          ? "#3B82F6"
                          : COLORS[idx % COLORS.length],
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {item.category}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.count} transactions
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    GH₵{Number(item.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{item.percentage}%</p>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">
                No expense data found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesTab({ sales, dateRange }) {
  const paymentMethodData = Array.isArray(sales.salesByMethod)
    ? sales.salesByMethod.map((method) => ({
        name: (method?.method || method?.paymentMethod || "Unknown").toUpperCase(),
        revenue: Number(method?._sum.totalAmount || 0),
        count: method?._count || 0,
      }))
    : [];
  const handleExport = () => exportSalesReport(sales, dateRange);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Sales Report</h2>
          <p className="text-sm text-gray-500">
            Revenue from counter & services
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
        >
          Export Sales
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Sales"
          value={sales.totalSales}
          subtitle="Transactions"
        />
        <StatCard
          title="Total Revenue"
          value={`GH₵${Number(sales.totalRevenue).toLocaleString()}`}
          subtitle="Gross Income"
        />
        <StatCard
          title="Avg. Sale"
          value={`GH₵${Number(sales.averageSale).toFixed(2)}`}
          subtitle="Per Transaction"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(val) => `GH₵${Number(val).toLocaleString()}`}
                  cursor={{ fill: "#f9fafb" }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Split</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                Counter Materials
              </span>
              <span className="font-bold text-gray-900">
                GH₵{Number(sales.materialSales).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                Booth Services
              </span>
              <span className="font-bold text-gray-900">
                GH₵{Number(sales.boothSales).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobsTab({ jobs, dateRange }) {
  const handleExport = () => exportJobsReport(jobs, dateRange);
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Jobs Report</h2>
          <p className="text-sm text-gray-500">
            Service repairs and labor analysis
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
        >
          Export Jobs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Jobs"
          value={jobs.totalJobs}
          subtitle="Completed"
        />
        <StatCard
          title="Revenue"
          value={`GH₵${Number(jobs.totalRevenue).toLocaleString()}`}
          subtitle="Invoiced"
        />
        <StatCard
          title="Materials"
          value={`GH₵${Number(jobs.totalMaterialsCost).toLocaleString()}`}
          subtitle="Cost"
        />
        <StatCard
          title="Labour"
          value={`GH₵${Number(jobs.totalLabourCost).toLocaleString()}`}
          subtitle="Value"
        />
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Payment Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Unpaid</div>
            <div className="text-xl font-bold text-red-900 mt-1">
              {jobs.unpaidJobs} Jobs
            </div>
            <div className="text-xs text-red-500 mt-1">
              GH₵{Number(jobs.unpaidAmount).toLocaleString()} outstanding
            </div>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
            <div className="text-sm text-amber-600 font-medium">
              Partially Paid
            </div>
            <div className="text-xl font-bold text-amber-900 mt-1">
              {jobs.partialJobs} Jobs
            </div>
            <div className="text-xs text-amber-500 mt-1">
              GH₵{Number(jobs.partialAmount).toLocaleString()} due
            </div>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="text-sm text-emerald-600 font-medium">
              Fully Paid
            </div>
            <div className="text-xl font-bold text-emerald-900 mt-1">
              {jobs.paidJobs} Jobs
            </div>
            <div className="text-xs text-emerald-500 mt-1">
              GH₵{Number(jobs.paidAmount).toLocaleString()} collected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PLTab({ pl, dateRange }) {
  const handleExport = () => exportProfitLoss(pl, dateRange);
  const netProfit = Number(pl.netProfit || 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Profit & Loss</h2>
          <p className="text-sm text-gray-500">Net income statement</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
        >
          Export P&L
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Revenue */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
              Revenue
            </h3>
            <div className="space-y-2">
              <PLRow label="Material Sales" value={pl.materialsSales} />
              <PLRow label="Booth Services" value={pl.boothSales} />
              <PLRow label="Service Jobs" value={pl.jobsRevenue} />
              <div className="pt-2 border-t border-gray-100">
                <PLRow
                  label="Total Revenue"
                  value={pl.grossRevenue}
                  isTotal
                />
              </div>
            </div>
          </div>

          {/* COGS */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
              Cost of Goods Sold
            </h3>
            <div className="space-y-2">
              <PLRow
                label="Material Cost (Counter)"
                value={pl.revenue?.counterSalesBreakdown?.materials?.cogs}
                isNegative
              />
              <PLRow
                label="Job Material Cost"
                value={pl.revenue?.jobProfitAnalysis?.materialCosts}
                isNegative
              />
              <div className="pt-2 border-t border-gray-100">
                <PLRow
                  label="Total COGS"
                  value={pl.cogs}
                  isNegative
                  isTotal
                />
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="p-4 bg-indigo-50 rounded-lg flex justify-between items-center">
            <span className="font-bold text-indigo-900">Gross Profit</span>
            <div className="text-right">
              <div className="text-xl font-bold text-indigo-700">
                GH₵{Number(pl.grossProfit).toLocaleString()}
              </div>
              <div className="text-xs text-indigo-600">
                {pl.grossProfitMargin}% Margin
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
              Operating Expenses
            </h3>
            <div className="space-y-2">
              <PLRow
                label="Operational Costs"
                value={pl.operationalExpenses}
                isNegative
              />
            </div>
          </div>

          {/* Net Profit */}
          <div
            className={`p-4 rounded-lg flex justify-between items-center ${
              netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"
            }`}
          >
            <span
              className={`font-bold ${
                netProfit >= 0 ? "text-emerald-900" : "text-red-900"
              }`}
            >
              Net Profit
            </span>
            <div className="text-right">
              <div
                className={`text-2xl font-bold ${
                  netProfit >= 0 ? "text-emerald-700" : "text-red-700"
                }`}
              >
                GH₵{netProfit.toLocaleString()}
              </div>
              <div
                className={`text-xs ${
                  netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {pl.netProfitMargin}% Margin
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PLRow({ label, value, isNegative, isTotal }) {
  return (
    <div
      className={`flex justify-between items-center ${
        isTotal ? "font-bold text-gray-900" : "text-sm text-gray-600"
      }`}
    >
      <span>{label}</span>
      <span className={isNegative ? "text-red-600" : ""}>
        {isNegative ? "-" : ""}GH₵{Number(value || 0).toLocaleString()}
      </span>
    </div>
  );
}

function MaterialUsageTab({ materialUsage, dateRange }) {
  const handleExport = () =>
    exportMaterialUsage(materialUsage.allMaterials, dateRange);
  const materials = materialUsage.allMaterials || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Material Usage</h2>
          <p className="text-sm text-gray-500">Inventory consumption report</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
        >
          Export Usage
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Material</th>
                <th className="px-6 py-3 text-right">Qty Used</th>
                <th className="px-6 py-3 text-right">Revenue</th>
                <th className="px-6 py-3 text-right">Cost</th>
                <th className="px-6 py-3 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materials.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {m.materialName}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {Number(m.totalQuantity).toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    GH₵{Number(m.totalRevenue).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-500">
                    GH₵{Number(m.totalCost).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-green-600">
                    GH₵{Number(m.totalProfit).toLocaleString()}
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No material usage recorded in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper for simple stats
function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
        {title}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}