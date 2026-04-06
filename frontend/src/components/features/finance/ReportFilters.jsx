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
  const now = new Date(); // fresh reference
  let start, end;

  switch (preset) {
    case 'today':
      start = end = format(now, 'yyyy-MM-dd');
      break;
    case 'this-week': {
      // Don't mutate now — create a new date
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      start = format(weekStart, 'yyyy-MM-dd');
      end = format(now, 'yyyy-MM-dd');
      break;
    }
    case 'this-month':
      start = format(startOfMonth(now), 'yyyy-MM-dd');
      end = format(endOfMonth(now), 'yyyy-MM-dd');
      break;
    case 'last-month': {
      // Don't mutate now — pass year/month directly
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
      end = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
      break;
    }
    case 'this-year':
      start = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');
      end = format(now, 'yyyy-MM-dd');
      break;
    case '3-months':
      start = format(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()), 'yyyy-MM-dd');
      end = format(now, 'yyyy-MM-dd');
      break;
    case '6-months':
      start = format(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()), 'yyyy-MM-dd');
      end = format(now, 'yyyy-MM-dd');
      break;
    case '12-months':
      start = format(new Date(now.getFullYear(), now.getMonth() - 12, now.getDate()), 'yyyy-MM-dd');
      end = format(now, 'yyyy-MM-dd');
      break;
    default:
      return;
  }

  onDateChange({ startDate: start, endDate: end });
};

  return (
    <Card className="bg-white border border-gray-200 shadow-sm p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-end justify-between">
        
        {/* Date Inputs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative group flex-1 sm:flex-none">
            <label className="absolute -top-2 left-2 bg-white px-1 text-[8px] sm:text-[10px] text-gray-500 group-focus-within:text-gray-900 transition-colors">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleInputChange}
              className="w-full sm:w-36 lg:w-40 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
            />
          </div>
          <span className="hidden sm:inline text-gray-400">-</span>
          <div className="relative group flex-1 sm:flex-none">
            <label className="absolute -top-2 left-2 bg-white px-1 text-[8px] sm:text-[10px] text-gray-500 group-focus-within:text-gray-900 transition-colors">End Date</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleInputChange}
              className="w-full sm:w-36 lg:w-40 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
            />
          </div>
        </div>

        {/* Action Group */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <div className="flex bg-gray-100 p-0.5 sm:p-1 rounded-lg gap-0.5 sm:gap-1 flex-wrap sm:flex-nowrap">
            {[
              { id: 'today',     label: 'Today' },
              { id: 'this-week', label: 'This Week' },
              { id: 'this-month', label: 'This Month' },
              { id: '3-months',  label: '3 Months' },
              { id: '6-months',  label: '6 Months' },
              { id: '12-months', label: '12 Months' },
            ].map(({ id, label }) => (
               <button
                 key={id}
                 onClick={() => setPresetRange(id)}
                 className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all"
               >
                 {label}
               </button>
            ))}
          </div>

          {onExport && (
            <Button 
              size="sm" 
              variant="primary"
              onClick={onExport}
              className="bg-gray-900 hover:bg-black text-white border-transparent text-xs sm:text-sm w-full sm:w-auto"
              icon={
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              Export Report
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}