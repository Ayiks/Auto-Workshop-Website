// src/components/features/finance/ChartCard.jsx
import Card from '@components/common/Card';

export default function ChartCard({ 
  title, 
  subtitle, 
  children, 
  action,
  height = 300 
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div style={{ height: `${height}px` }} className="w-full">
        {children}
      </div>
    </Card>
  );
}