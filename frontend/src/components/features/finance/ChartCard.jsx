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
      <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-white rounded-t-xl">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
      <div className="p-6 w-full flex-1 min-h-0">
        <div style={{ height: `${height}px` }} className="w-full">
          {children}
        </div>
      </div>
    </Card>
  );
}