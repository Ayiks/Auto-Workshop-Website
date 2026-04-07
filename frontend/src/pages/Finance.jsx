// src/pages/Finance.jsx
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { materialsApi } from "@api/materials";
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
  LineChart,
  Line,
  Legend,
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
  const { data: aparData, isLoading: loadingAPAR } = useQuery({
    queryKey: ["ap-ar"],
    queryFn: () => reportsApi.getAPAR(),
  });

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

  const _jobsSummary = jobsData?.data?.summary || {};
  const _jobsPayment = jobsData?.data?.paymentStatusBreakdown || {};

  const jobs = {
    totalJobs:          _jobsSummary.totalJobs || 0,
    totalRevenue:       _jobsSummary.totalJobRevenue || 0,    // service revenue earned (cash basis)
    totalPaid:          _jobsSummary.totalPaid || 0,          // total cash received
    totalOutstanding:   _jobsSummary.totalOutstanding || 0,   // total amountDue remaining
    totalMaterialsCost: _jobsSummary.totalMaterialsCost || 0,
    totalLabourCost:    _jobsSummary.totalLabourCost || 0,
    totalMiscellaneous: _jobsSummary.totalMiscellaneousCost || 0,
    averageJob: (_jobsSummary.totalJobRevenue || 0) / (_jobsSummary.totalJobs || 1),
    unpaidJobs:    _jobsPayment.unpaid?.count || 0,
    unpaidAmount:  _jobsPayment.unpaid?.amountDue || 0,   // outstanding balance on unpaid invoices
    partialJobs:   _jobsPayment.partial?.count || 0,
    partialAmount: _jobsPayment.partial?.amountDue || 0,  // remaining balance on partial invoices
    paidJobs:      _jobsPayment.paid?.count || 0,
    paidAmount:    _jobsPayment.paid?.amount || 0,        // totalAmount = amountPaid when fully paid
    revenueByType:         jobsData?.data?.revenueByType,
    materialUsage:         jobsData?.data?.materialUsage,
    paymentStatusBreakdown: _jobsPayment,
    recentJobs:            jobsData?.data?.recentJobs,
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

  // const isLoading =
  //   loadingSales ||
  //   loadingJobs ||
  //   loadingExpenses ||
  //   loadingPL ||
  //   loadingRevenue ||
  //   loadingMaterialUsage;

  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen bg-gray-50">
  //       <LoadingSpinner size="lg" text="Loading financial data..." />
  //     </div>
  //   );
  // }

  const apar = {
    ar: aparData?.data?.ar || { total: 0, invoices: { total: 0, count: 0, items: [] }, sales: { total: 0, count: 0, items: [] } },
    ap: aparData?.data?.ap || { total: 0, count: 0, items: [] },
  };

  const isFetching =
  loadingSales || loadingJobs || loadingExpenses ||
  loadingPL || loadingRevenue || loadingMaterialUsage || loadingAPAR;


  return (
    <div className="min-h-screen bg-gray-50">
       {isFetching && (
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gray-100">
        <div className="h-full bg-indigo-500 animate-pulse w-full" />
      </div>
    )}
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
              { id: "sales", label: "Sales" },
              { id: "jobs", label: "Jobs" },
              { id: "expenses", label: "Expenses" },
              { id: "pl", label: "P&L" },
              { id: "materials", label: "Materials" },
              { id: "inventory", label: "Inventory" },
              { id: "apar", label: "AP/AR" },
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
              dateRange={dateRange}
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
          {activeTab === "inventory" && <InventorySnapshotTab />}
          {activeTab === "apar" && <APARTab apar={apar} />}
        </div>
      </div>
    </div>
  );
}

// --- OVERVIEW TAB 
function OverviewTab({ pl, revenue, expenses, dateRange, sales, jobs }) {
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
       <TrendsChart dateRange={dateRange} />
    </div>
  );
}

function ExpensesTab({ expenses, dateRange }) {
  const data = expenses?.breakdown?.byCategory || [];
  const totalExpenses = expenses?.totalExpenses || 0;
  const monthlyTrend = (expenses?.monthlyTrend || []).map((m) => ({
    month: m.month ? format(new Date(m.month), "MMM yy") : "—",
    total: Number(m.total || 0),
  }));
  const recentExpenses = expenses?.recentExpenses || [];

  const handleExport = () => { try { exportExpensesReport(expenses, dateRange); } catch (e) { toast.error(e.message); } };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Expenses Report</h2>
          <p className="text-sm text-gray-500">Operational costs and material purchases</p>
        </div>
        <button onClick={handleExport} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors">
          Export Expenses
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Outflow</div>
          <div className="text-2xl font-bold text-gray-900">GH₵{Number(totalExpenses).toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">OpEx + Material Purchases</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Operational</div>
          <div className="text-2xl font-bold text-gray-900">GH₵{Number(expenses.operationalTotal || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">{expenses.operationalCount || 0} transactions</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Material Restock</div>
          <div className="text-2xl font-bold text-blue-600">GH₵{Number(expenses.cogTotal || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">{expenses.materialReorderCount || 0} purchases</div>
        </div>
      </div>

      {/* Monthly Trend */}
      {monthlyTrend.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Monthly Expense Trend</h3>
          <p className="text-sm text-gray-500 mb-4">Total spending per month over the selected period</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} stroke="#94A3B8" />
                <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="#94A3B8"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                  formatter={(val) => [`GH₵${Number(val).toLocaleString()}`, "Expenses"]}
                />
                <Bar dataKey="total" fill="#EF4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Breakdown Chart + Category Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Expense Breakdown by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" stroke="#94A3B8" fontSize={12} tickFormatter={(val) => `GH₵${val / 1000}k`} />
                <YAxis dataKey="category" type="category" width={120} stroke="#475569" fontSize={12} style={{ textTransform: "capitalize" }} />
                <Tooltip cursor={{ fill: "#F1F5F9" }} formatter={(val) => `GH₵${Number(val).toLocaleString()}`}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.category === "Material Purchases" ? "#3B82F6" : COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-0 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Spending Details</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.category === "Material Purchases" ? "#3B82F6" : COLORS[idx % COLORS.length] }} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{item.category}</p>
                    <p className="text-xs text-gray-500">{item.count} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">GH₵{Number(item.amount).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{item.percentage}%</p>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No expense data found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Expenses */}
      {recentExpenses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Expenses</h3>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-full">Last {recentExpenses.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentExpenses.map((exp, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                      {exp.expenseDate ? format(new Date(exp.expenseDate), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full capitalize"
                        style={{ backgroundColor: exp.category === "materials" ? "#EFF6FF" : "#F1F5F9", color: exp.category === "materials" ? "#3B82F6" : "#475569" }}>
                        {exp.category || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-700 max-w-xs truncate">
                      {exp.materialReorder?.materialName
                        ? `${exp.materialReorder.materialName} (×${exp.materialReorder.quantityOrdered})`
                        : exp.description || "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">GH₵{Number(exp.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesTab({ sales, dateRange }) {
  const paymentMethodData = Array.isArray(sales.salesByMethod)
    ? sales.salesByMethod.map((method) => ({
        name: (method?.method || method?.paymentMethod || "Unknown").toUpperCase(),
        revenue: Number(method?._sum?.amountPaid || 0),
        count: method?._count || 0,
      }))
    : [];

  const dailyTrendData = (sales.dailyTrend || []).map((d) => ({
    date: d.date ? d.date.slice(5) : "",
    revenue: Number(d.total || 0),
    sales: Number(d.count || 0),
  }));

  const materialItems = sales.breakdown?.materials?.items || [];
  const boothItems = sales.breakdown?.booth?.items || [];
  const recentSales = sales.recentSales || [];

  const handleExport = () => { try { exportSalesReport(sales, dateRange); } catch (e) { toast.error(e.message); } };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Sales Report</h2>
          <p className="text-sm text-gray-500">Counter sales & booth services breakdown</p>
        </div>
        <button onClick={handleExport} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors">
          Export Sales
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Transactions" value={sales.totalSales} subtitle="Total sales" />
        <StatCard title="Total Revenue" value={`GH₵${Number(sales.totalRevenue).toLocaleString()}`} subtitle="Gross income" />
        <StatCard title="Material Sales" value={`GH₵${Number(sales.materialSales).toLocaleString()}`} subtitle="Counter stock" />
        <StatCard title="Booth Sales" value={`GH₵${Number(sales.boothSales).toLocaleString()}`} subtitle="Services" />
        <StatCard title="Avg. Sale" value={`GH₵${Number(sales.averageSale).toFixed(2)}`} subtitle="Per transaction" />
      </div>

      {/* Daily Trend */}
      {dailyTrendData.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Daily Sales Trend</h3>
          <p className="text-sm text-gray-500 mb-4">Revenue per day over the selected period</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={11} stroke="#94A3B8" />
                <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="#94A3B8"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                  formatter={(val) => [`GH₵${Number(val).toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#6366F1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Payment Methods + Revenue Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
          {paymentMethodData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip formatter={(val) => `GH₵${Number(val).toLocaleString()}`} cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="revenue" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No payment data</div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Split</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-lg">
              <div>
                <span className="text-sm font-semibold text-gray-800">Counter Materials</span>
                <div className="text-xs text-gray-500">{sales.breakdown?.materials?.count || 0} line items</div>
              </div>
              <span className="font-bold text-gray-900">GH₵{Number(sales.materialSales).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg">
              <div>
                <span className="text-sm font-semibold text-gray-800">Booth Services</span>
                <div className="text-xs text-gray-500">{sales.breakdown?.booth?.count || 0} transactions</div>
              </div>
              <span className="font-bold text-gray-900">GH₵{Number(sales.boothSales).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span className="font-bold text-gray-700">Total</span>
              <span className="font-bold text-lg text-gray-900">GH₵{Number(sales.totalRevenue).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Material Sales Detail */}
      {materialItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Material Sales Detail</h3>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-full">{materialItems.length} items</span>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Material</th>
                  <th className="px-6 py-3 text-right">Qty</th>
                  <th className="px-6 py-3 text-right">Unit Price</th>
                  <th className="px-6 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materialItems.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                      {item.saleDate ? format(new Date(item.saleDate), "dd MMM") : "—"}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">{item.materialName || "—"}</td>
                    <td className="px-6 py-3 text-right">{Number(item.quantity || 0).toFixed(2)}</td>
                    <td className="px-6 py-3 text-right text-gray-500">GH₵{Number(item.unitPrice || 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">GH₵{Number(item.subtotal || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booth Sales Detail */}
      {boothItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Booth Sales Detail</h3>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-full">{boothItems.length} transactions</span>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Service</th>
                  <th className="px-6 py-3">Category</th>
                  {/* <th className="px-6 py-3">Type</th> */}
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {boothItems.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                      {item.saleDate ? format(new Date(item.saleDate), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">{item.serviceName || "—"}</td>
                    <td className="px-6 py-3 text-gray-600 capitalize">{item.category || "—"}</td>
                    {/* <td className="px-6 py-3">
                      {item.type ? (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 capitalize">{item.type}</span>
                      ) : "—"}
                    </td> */}
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">GH₵{Number(item.subtotal || item.price || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      

      {sales.totalSales === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">No sales recorded in this period.</p>
        </div>
      )}
    </div>
  );
}

const JOB_TYPE_COLORS = {
  mechanic: "#6366F1",
  sprayer: "#10B981",
  bodyworks: "#F59E0B",
  other: "#64748B",
};

function JobsTab({ jobs, dateRange }) {
  const handleExport = () => { try { exportJobsReport(jobs, dateRange); } catch (e) { toast.error(e.message); } };

  const revenueByTypeData = Object.entries(jobs.revenueByType || {})
    .map(([type, data]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      typeKey: type,
      revenue: Number(data.revenue || 0),
      jobs: data.jobs || 0,
      labourCost: Number(data.labourCost || 0),
      miscellaneousCost: Number(data.miscellaneousCost || 0),
    }))
    .filter((d) => d.jobs > 0);

  const materialUsageData = (jobs.materialUsage || [])
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 15);

  const recentJobs = jobs.recentJobs || [];

  const paymentStatusColors = {
    paid: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600", bold: "text-emerald-900", sub: "text-emerald-500" },
    partial: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-600", bold: "text-amber-900", sub: "text-amber-500" },
    unpaid: { bg: "bg-red-50", border: "border-red-100", text: "text-red-600", bold: "text-red-900", sub: "text-red-500" },
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Jobs Report</h2>
          <p className="text-sm text-gray-500">Service repairs and labor analysis</p>
        </div>
        <button onClick={handleExport} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors">
          Export Jobs
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Jobs" value={jobs.totalJobs} subtitle="Invoices" />
        <StatCard title="Revenue" value={`GH₵${Number(jobs.totalRevenue).toLocaleString()}`} subtitle="Service earned (paid)" />
        <StatCard title="Avg. Job Value" value={`GH₵${Number(jobs.averageJob || 0).toFixed(0)}`} subtitle="Per invoice" />
        <StatCard title="Outstanding" value={`GH₵${Number(jobs.totalOutstanding).toLocaleString()}`} subtitle="Amount due" />
      </div>

      {/* Revenue by Job Type */}
      {revenueByTypeData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Revenue by Job Type</h3>
            <p className="text-sm text-gray-500 mb-4">Labour & miscellaneous revenue per department</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByTypeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="type" axisLine={false} tickLine={false} fontSize={12} stroke="#94A3B8" />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="#94A3B8"
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                    formatter={(val) => [`GH₵${Number(val).toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={50}>
                    {revenueByTypeData.map((entry) => (
                      <Cell key={entry.typeKey} fill={JOB_TYPE_COLORS[entry.typeKey] || "#64748B"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Department Breakdown</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {revenueByTypeData.map((d) => (
                <div key={d.typeKey} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: JOB_TYPE_COLORS[d.typeKey] || "#64748B" }} />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{d.type}</div>
                      <div className="text-xs text-gray-500">{d.jobs} job{d.jobs !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">GH₵{d.revenue.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">Labour + Misc</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Status */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Payment Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: "paid", label: "Fully Paid", count: jobs.paidJobs, amount: jobs.paidAmount, amountLabel: "collected" },
            { key: "partial", label: "Partially Paid", count: jobs.partialJobs, amount: jobs.partialAmount, amountLabel: "due" },
            { key: "unpaid", label: "Unpaid", count: jobs.unpaidJobs, amount: jobs.unpaidAmount, amountLabel: "outstanding" },
          ].map(({ key, label, count, amount, amountLabel }) => {
            const c = paymentStatusColors[key];
            return (
              <div key={key} className={`p-4 ${c.bg} border ${c.border} rounded-lg`}>
                <div className={`text-sm ${c.text} font-medium`}>{label}</div>
                <div className={`text-xl font-bold ${c.bold} mt-1`}>{count} Jobs</div>
                <div className={`text-xs ${c.sub} mt-1`}>GH₵{Number(amount).toLocaleString()} {amountLabel}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Materials Used in Jobs */}
      {materialUsageData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Materials Used in Jobs</h3>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-full">{(jobs.materialUsage || []).length} materials</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Material</th>
                  <th className="px-6 py-3 text-right">Qty Used</th>
                  <th className="px-6 py-3 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materialUsageData.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{m.materialName}</td>
                    <td className="px-6 py-3 text-right">{Number(m.quantity || 0).toFixed(2)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">GH₵{Number(m.cost || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Client / Vehicle</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-right">Paid</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentJobs.map((inv, i) => {
                  const status = inv.paymentStatus?.toLowerCase() || "unpaid";
                  const statusStyle = {
                    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    partial: "bg-amber-50 text-amber-700 border-amber-200",
                    unpaid: "bg-red-50 text-red-700 border-red-200",
                  }[status] || "bg-gray-50 text-gray-600 border-gray-200";
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        {inv.invoiceDate ? format(new Date(inv.invoiceDate), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">{inv.job?.clientName || "—"}</div>
                        <div className="text-xs text-gray-400">{inv.job?.vehicleRegNumber || ""}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full capitalize"
                          style={{ backgroundColor: (JOB_TYPE_COLORS[inv.job?.jobType] || "#64748B") + "20", color: JOB_TYPE_COLORS[inv.job?.jobType] || "#64748B" }}>
                          {inv.job?.jobType || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">GH₵{Number(inv.totalAmount || 0).toLocaleString()}</td>
                      <td className="px-6 py-3 text-right text-emerald-600">GH₵{Number(inv.amountPaid || 0).toLocaleString()}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border capitalize ${statusStyle}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PLTab({ pl, dateRange }) {
  const handleExport = () => { try { exportProfitLoss(pl, dateRange); } catch (e) { toast.error(e.message); } };
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
  const handleExport = () => { try { exportMaterialUsage(materialUsage.allMaterials, dateRange); } catch (e) { toast.error(e.message); } };
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

function TrendsChart({ dateRange }) {
  const [periods, setPeriods] = useState(6);
  const [unit, setUnit] = useState('month');
  const [chartType, setChartType] = useState('line');
  const [activeMetrics, setActiveMetrics] = useState(['revenue', 'expenses', 'netProfit']);

  const { data: trendsData, isLoading } = useQuery({
    queryKey: ['trends', periods, unit],
    queryFn: () => reportsApi.getTrends({ periods, unit }),
  });

  const data = trendsData?.data || [];

  const METRICS = [
    { key: 'revenue', label: 'Revenue', color: '#6366F1' },
    { key: 'expenses', label: 'Expenses', color: '#EF4444' },
    { key: 'netProfit', label: 'Net Profit', color: '#10B981' },
    { key: 'salesCount', label: 'Sales Count', color: '#F59E0B' },
  ];

  const PERIOD_OPTIONS = [
    { label: '2 Months', value: 2, unit: 'month' },
    { label: '3 Months', value: 3, unit: 'month' },
    { label: '6 Months', value: 6, unit: 'month' },
    { label: '12 Months', value: 12, unit: 'month' },
  ];

  const toggleMetric = (key) => {
    setActiveMetrics(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  const ChartComponent = chartType === 'line' ? LineChart : BarChart;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Trend Comparison</h3>
          <p className="text-sm text-gray-500 mt-0.5">Compare performance across periods</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.label}
                onClick={() => { setPeriods(opt.value); setUnit(opt.unit); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  periods === opt.value && unit === opt.unit
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Chart type toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                chartType === 'line' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                chartType === 'bar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Bar
            </button>
          </div>
        </div>
      </div>

      {/* Metric toggles */}
      <div className="flex flex-wrap gap-2 mb-6">
        {METRICS.map(metric => (
          <button
            key={metric.key}
            onClick={() => toggleMetric(metric.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              activeMetrics.includes(metric.key)
                ? 'border-transparent text-white'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
            style={activeMetrics.includes(metric.key)
              ? { backgroundColor: metric.color, borderColor: metric.color }
              : {}
            }
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activeMetrics.includes(metric.key) ? 'white' : metric.color }}
            />
            {metric.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-72 flex items-center justify-center">
          <LoadingSpinner size="md" text="Loading trends..." />
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} stroke="#94A3B8" />
                <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#94A3B8"
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(val, name) => {
                    const metric = METRICS.find(m => m.key === name);
                    return name === 'salesCount'
                      ? [val, metric?.label]
                      : [`GH₵${Number(val).toLocaleString()}`, metric?.label];
                  }}
                />
                <Legend formatter={name => METRICS.find(m => m.key === name)?.label} />
                {METRICS.filter(m => activeMetrics.includes(m.key)).map(metric => (
                  <Line
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    stroke={metric.color}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: metric.color }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} stroke="#94A3B8" />
                <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#94A3B8"
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(val, name) => {
                    const metric = METRICS.find(m => m.key === name);
                    return name === 'salesCount'
                      ? [val, metric?.label]
                      : [`GH₵${Number(val).toLocaleString()}`, metric?.label];
                  }}
                />
                <Legend formatter={name => METRICS.find(m => m.key === name)?.label} />
                {METRICS.filter(m => activeMetrics.includes(m.key)).map(metric => (
                  <Bar key={metric.key} dataKey={metric.key} fill={metric.color} radius={[3, 3, 0, 0]} barSize={20} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// --- INVENTORY SNAPSHOT TAB ---
const SNAPSHOT_PRESETS = [
  { id: 'this-month',    label: 'This Month' },
  { id: 'last-month',    label: 'Last Month' },
  { id: 'this-quarter',  label: 'This Quarter' },
  { id: 'last-quarter',  label: 'Last Quarter' },
  { id: 'mid-year',      label: 'Mid-Year' },
  { id: 'year-to-date',  label: 'Year to Date' },
  { id: 'full-year',     label: 'Full Year' },
  { id: 'custom',        label: 'Custom' },
];

function getDateForPreset(preset, customDate) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  const pad = (n) => String(n).padStart(2, '0');
  // Returns the first day of a given month (month is 0-indexed)
  const firstDay = (year, month) => `${year}-${pad(month + 1)}-01`;

  switch (preset) {
    case 'this-month':   return firstDay(y, m);
    case 'last-month':   return m === 0 ? firstDay(y - 1, 11) : firstDay(y, m - 1);
    case 'this-quarter': {
      const qStartM = Math.floor(m / 3) * 3; // 0, 3, 6, or 9
      return firstDay(y, qStartM);
    }
    case 'last-quarter': {
      const qStartM = Math.floor(m / 3) * 3 - 3;
      return qStartM < 0 ? firstDay(y - 1, 9) : firstDay(y, qStartM);
    }
    case 'mid-year':     return `${y}-07-01`;
    case 'year-to-date': return `${y}-01-01`;
    case 'full-year':    return `${y}-01-01`;
    case 'custom':       return customDate || now.toISOString().split('T')[0];
    default:             return now.toISOString().split('T')[0];
  }
}

function InventorySnapshotTab() {
  const today = new Date();
  const [preset, setPreset] = useState('this-month');
  const [customDate, setCustomDate] = useState(today.toISOString().split('T')[0]);

  const snapshotDate = getDateForPreset(preset, customDate);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-snapshot', snapshotDate],
    queryFn: () => materialsApi.getInventorySnapshot(snapshotDate),
    enabled: !!snapshotDate,
  });

  const snapshot = data?.data || [];

  const exportCSV = () => {
    if (!snapshot.length) return;
    const headers = ['Material', 'Unit', `Stock at ${snapshotDate}`, 'Current Stock', 'Change'];
    const rows = snapshot.map(m => [m.name, m.baseUnit, m.stockAtDate, m.currentStock, m.change]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-snapshot-${snapshotDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-bold text-gray-900">Inventory Snapshot</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            See how much stock you had at any point in time, calculated from reorder and sales history.
          </p>
        </div>

        {/* Period selector */}
        <div className="mb-5">
          <div className="flex flex-wrap gap-2">
            {SNAPSHOT_PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  preset === p.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="mt-3 flex items-center gap-3">
              <input
                type="date"
                value={customDate}
                max={today.toISOString().split('T')[0]}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              />
              <span className="text-xs text-gray-400">Stock levels as of this date</span>
            </div>
          )}

          {preset !== 'custom' && (
            <p className="mt-2 text-xs text-gray-400">
              Showing stock levels as at the start of this period — <span className="font-medium text-gray-600">{snapshotDate}</span>
            </p>
          )}
        </div>

        <div className="flex justify-end mb-3">
          <button
            onClick={exportCSV}
            disabled={!snapshot.length}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Export CSV
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full" />
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-red-500 text-sm">
            Failed to load inventory data. Please try again.
          </div>
        ) : snapshot.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No inventory data found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Material</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock at {snapshotDate}</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Stock</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snapshot.map((item) => {
                  const atDate = parseFloat(item.stockAtDate) || 0;
                  const current = parseFloat(item.currentStock) || 0;
                  const change = parseFloat(item.change) || 0;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                      <td className="py-3 px-4 text-center text-gray-500">{item.baseUnit}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{atDate.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{current.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {change > 0 ? '+' : ''}{change.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- AP/AR TAB ---
function APARTab({ apar }) {
  const { ar, ap } = apar;

  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => { try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; } };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Accounts Receivable (AR)</p>
          <p className="text-3xl font-bold text-gray-900">GH₵{fmt(ar.total)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {ar.invoices.count} job invoice{ar.invoices.count !== 1 ? 's' : ''} · {ar.sales.count} sale{ar.sales.count !== 1 ? 's' : ''} outstanding
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Accounts Payable (AP)</p>
          <p className="text-3xl font-bold text-gray-900">GH₵{fmt(ap.total)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {ap.count} unpaid restock order{ap.count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* AR — Job Invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">AR — Outstanding Job Invoices</h3>
          <span className="text-sm font-semibold text-blue-600">GH₵{fmt(ar.invoices.total)}</span>
        </div>
        {ar.invoices.items.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center bg-gray-50 rounded-xl">No outstanding job invoices</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-500 uppercase font-medium">
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ar.invoices.items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.job?.clientName || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.job?.vehicleRegNumber || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">GH₵{fmt(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">GH₵{fmt(inv.amountPaid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">GH₵{fmt(inv.amountDue)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-3">
                      {inv.paymentStatus === 'partial'
                        ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Partial</span>
                        : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Unpaid</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AR — Sales */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">AR — Outstanding Sales</h3>
          <span className="text-sm font-semibold text-blue-600">GH₵{fmt(ar.sales.total)}</span>
        </div>
        {ar.sales.items.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center bg-gray-50 rounded-xl">No outstanding sales</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-500 uppercase font-medium">
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ar.sales.items.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{sale.customerName || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-gray-500">{sale.customerPhone || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">GH₵{fmt(sale.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">GH₵{fmt(sale.amountPaid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">GH₵{fmt(sale.balance)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(sale.saleDate)}</td>
                    <td className="px-4 py-3">
                      {sale.paymentStatus === 'partial'
                        ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Partial</span>
                        : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Unpaid</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AP — Unpaid Restock Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">AP — Unpaid Restock Orders</h3>
          <span className="text-sm font-semibold text-orange-600">GH₵{fmt(ap.total)}</span>
        </div>
        {ap.items.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center bg-gray-50 rounded-xl">No unpaid restock orders</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-500 uppercase font-medium">
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-right">Total Owed</th>
                  <th className="px-4 py-3 text-left">Order Date</th>
                  <th className="px-4 py-3 text-left">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ap.items.map((order, idx) => {
                  const itemSummary = order.items.length === 1
                    ? order.items[0].materialName
                    : `${order.items[0].materialName} +${order.items.length - 1} more`;
                  return (
                    <tr key={order.orderId || idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{order.vendor?.companyName || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{itemSummary}</p>
                        <p className="text-xs text-gray-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-orange-600">GH₵{fmt(order.totalCost)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(order.reorderDate)}</td>
                      <td className="px-4 py-3">
                        {order.status === 'pending'
                          ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
                          : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Received</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}