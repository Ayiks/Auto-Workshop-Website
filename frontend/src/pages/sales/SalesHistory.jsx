import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { format } from 'date-fns';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });
  const [expandedSale, setExpandedSale] = useState(null);

  useEffect(() => {
    fetchSales();
  }, [filters.page]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
      });

      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/sales?${params}`);
      setSales(response.sales || []);
      setPagination({
        total: response.total || 0,
        totalPages: response.totalPages || 0,
        currentPage: response.page || 1,
      });
    } catch (error) {
      console.error('Error fetching sales:', error);
      alert('Failed to fetch sales history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleApplyFilters = () => {
    setFilters(prev => ({ ...prev, page: 1 }));
    fetchSales();
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20,
    });
    setTimeout(() => fetchSales(), 100);
  };

  const toggleExpandSale = (saleId) => {
    setExpandedSale(expandedSale === saleId ? null : saleId);
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Calculate totals
  const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
  const totalProfit = sales.reduce((sum, sale) => sum + parseFloat(sale.totalProfit), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
            <p className="text-gray-600 mt-1">View all material sales transactions</p>
          </div>
          <Link to="/sales" className="btn-primary">
            + New Sale
          </Link>
        </div>

        {/* Filters */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleApplyFilters}
                className="flex-1 btn-primary"
              >
                Apply Filters
              </button>
              <button
                onClick={handleClearFilters}
                className="flex-1 btn-secondary"
              >
                Clear
              </button>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <p className="font-medium">Showing {sales.length} of {pagination.total}</p>
                <p>Page {pagination.currentPage} of {pagination.totalPages}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {sales.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Total Transactions</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {sales.length}
              </p>
            </div>

            <div className="card bg-green-50 border border-green-200">
              <p className="text-sm text-green-600 font-medium">Total Sales Amount</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                GH₵ {totalAmount.toFixed(2)}
              </p>
            </div>

            <div className="card bg-emerald-50 border border-emerald-200">
              <p className="text-sm text-emerald-600 font-medium">Total Profit</p>
              <p className="text-3xl font-bold text-emerald-900 mt-2">
                GH₵ {totalProfit.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Sales List */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transactions</h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading sales...</p>
              </div>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-500 text-lg">No sales found</p>
              <p className="text-gray-400 text-sm mt-2">
                {filters.startDate || filters.endDate
                  ? 'Try adjusting your filters'
                  : 'Sales will appear here once transactions are made'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => {
                const isExpanded = expandedSale === sale.id;
                const hasLabour = sale.items?.some(i => i.material?.name === 'Labour/Workmanship');
                const nonLabourItems = sale.items?.filter(i => i.material?.name !== 'Labour/Workmanship') || [];
                const nonLabourTotal = nonLabourItems.reduce((s, i) => s + parseFloat(i.subtotal), 0);
                const nonLabourProfit = nonLabourItems.reduce((s, i) => s + parseFloat(i.profit), 0);

                return (
                  nonLabourItems.length === 0 ? null :
                  <div
                    key={sale.id}
                    className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    {/* Sale Header */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpandSale(sale.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-semibold text-gray-900">
                              Sale #{sale.id}
                            </p>
                            {hasLabour && (
                              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                                From Job
                              </span>
                            )}
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                              {sale.paymentMethod?.toUpperCase() || 'CASH'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              📅 {format(new Date(sale.saleDate), 'MMM dd, yyyy • HH:mm:ss')}
                            </span>
                            <span className="flex items-center gap-1">
                              📦 {nonLabourItems.length} items
                            </span>
                            <span className="flex items-center gap-1">
                              👤 {sale.soldBy?.fullName || sale.soldBy?.username || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-gray-900">
                            GH₵ {nonLabourTotal.toFixed(2)}
                          </p>
                          <p className="text-sm text-green-600 font-semibold mt-1">
                            Profit: GH₵ {nonLabourProfit.toFixed(2)}
                          </p>
                          <button className="text-sm text-primary-600 hover:text-primary-700 mt-2">
                            {isExpanded ? '▼ Hide Details' : '▶ View Details'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sale Items (Expanded) */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Items Sold</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Material
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                  Quantity
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                  Unit Price
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                  Subtotal
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                  Profit
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {nonLabourItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {item.material?.name || 'Unknown'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-center font-medium">
                                    {item.quantity}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                    GH₵ {parseFloat(item.unitPrice).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                                    GH₵ {parseFloat(item.subtotal).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-green-600 text-right font-semibold">
                                    GH₵ {parseFloat(item.profit).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-100">
                              <tr>
                                <td colSpan="3" className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                  TOTAL:
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                  GH₵ {nonLabourTotal.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                                  GH₵ {nonLabourProfit.toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Additional Info */}
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-white p-3 rounded border border-gray-200">
                            <p className="text-gray-600">Cost Price Total</p>
                            <p className="text-lg font-semibold text-gray-900">
                              GH₵ {(nonLabourTotal - nonLabourProfit).toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-green-50 p-3 rounded border border-green-200">
                            <p className="text-green-600">Profit Margin</p>
                            <p className="text-lg font-semibold text-green-900">
                              {((nonLabourProfit / nonLabourTotal) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        {hasLabour && (
                          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                            <p className="text-sm text-purple-800">
                              ℹ️ This sale includes materials from a completed job. 
                              Labour charges are tracked separately in job sales reports.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-2">
                {[...Array(pagination.totalPages)].map((_, idx) => {
                  const pageNum = idx + 1;
                  // Show first page, last page, current page, and pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === pagination.totalPages ||
                    (pageNum >= filters.page - 1 && pageNum <= filters.page + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded ${
                          pageNum === filters.page
                            ? 'bg-primary-600 text-white font-semibold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === filters.page - 2 ||
                    pageNum === filters.page + 2
                  ) {
                    return <span key={pageNum} className="text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === pagination.totalPages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}