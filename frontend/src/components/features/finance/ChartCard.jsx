import Card from '@components/common/Card';

export default function ChartCard({ 
  title, 
  subtitle, 
  children, 
  action,
  height = 300 
}) {
  return (
    <Card className="flex flex-col h-full bg-white border border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 bg-white rounded-t-xl">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-sm text-gray-900 uppercase tracking-wide">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className="p-4 sm:p-6 w-full flex-1 min-h-0">
        <div style={{ height: `${height}px` }} className="w-full">
          {children}
        </div>
      </div>
    </Card>
  );
}