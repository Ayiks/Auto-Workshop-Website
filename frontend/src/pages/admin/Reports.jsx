import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { format } from 'date-fns';

export default function Reports() {
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      let response;

      if (reportType === 'daily') {
        response = await api.get(`/sales/reports/daily?date=${selectedDate}`);
      } else if (reportType === 'weekly') {
        response = await api.get(`/sales/reports/weekly?startDate=${selectedDate}`);
      } else if (reportType === 'monthly') {
        const [year, month] = selectedDate.split('-');
        response = await api.get(`/sales/reports/monthly?year=${year}&month=${month}`);
      }

      setReport(response);
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>

        {/* Report Controls */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="input"
              >
                <option value="daily">Daily Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
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
        </div>

        {/* Report Display */}
        {report && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card bg-blue-50 border-2 border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Total Sales</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  GH₵ {parseFloat(report.summary?.totalSales || 0).toFixed(2)}
                </p>
              </div>

              <div className="card bg-green-50 border-2 border-green-200">
                <p className="text-sm text-green-600 font-medium">Total Profit</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  GH₵ {parseFloat(report.summary?.totalProfit || 0).toFixed(2)}
                </p>
              </div>

              <div className="card bg-purple-50 border-2 border-purple-200">
                <p className="text-sm text-purple-600 font-medium">Transactions</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {report.summary?.transactionCount || 0}
                </p>
              </div>
            </div>

            {/* Daily Sales Breakdown */}
            {report.sales && report.sales.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold mb-4">Sales Breakdown</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Items
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
                      {report.sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {format(new Date(sale.saleDate), 'HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {sale.items?.length || 0} items
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            GH₵ {parseFloat(sale.totalAmount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-green-600">
                            GH₵ {parseFloat(sale.totalProfit).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!report && !loading && (
          <div className="card text-center py-12 text-gray-500">
            <p className="text-4xl mb-4">📊</p>
            <p>Select report type and date, then click "Generate Report"</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}