// src/components/features/finance/ReportFilters.jsx
import { format, startOfMonth, endOfMonth } from 'date-fns';
import Button from '@components/common/Button';
import Card from '@components/common/Card';

export default function ReportFilters({ 
  dateRange, 
  onDateChange, 
  onExport 
}) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onDateChange({ ...dateRange, [name]: value });
  };

  const setPresetRange = (preset) => {
    const now = new Date();
    let start, end;

    switch (preset) {
      case 'today':
        start = end = format(now, 'yyyy-MM-dd');
        break;
      case 'this-week':
        start = format(new Date(now.setDate(now.getDate() - now.getDay())), 'yyyy-MM-dd');
        end = format(new Date(), 'yyyy-MM-dd');
        break;
      case 'this-month':
        start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
        break;
      case 'last-month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        end = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      case 'this-year':
        start = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');
        end = format(new Date(), 'yyyy-MM-dd');
        break;
      default:
        return;
    }

    onDateChange({ startDate: start, endDate: end });
  };

  return (
    <Card>
      <div className="flex flex-col lg:flex-row gap-4 items-end">
        {/* Date Inputs */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setPresetRange('today')}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPresetRange('this-week')}>
            This Week
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPresetRange('this-month')}>
            This Month
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPresetRange('last-month')}>
            Last Month
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPresetRange('this-year')}>
            This Year
          </Button>
        </div>

        {/* Export Button */}
        {onExport && (
          <Button 
            size="sm" 
            variant="primary"
            onClick={onExport}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
        )}
      </div>
    </Card>
  );
}