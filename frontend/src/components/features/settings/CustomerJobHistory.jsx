import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@api/jobs';

const STATUS_STYLES = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  in_progress:'bg-blue-50 text-blue-700 border-blue-200',
  completed:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
};

const TYPE_STYLES = {
  mechanic:   'bg-gray-100 text-gray-600',
  sprayer:    'bg-purple-100 text-purple-700',
  bodyworks:  'bg-orange-100 text-orange-700',
  other:      'bg-teal-100 text-teal-700',
};

const fmt = (n) => `GH₵${parseFloat(n || 0).toFixed(2)}`;

export default function CustomerJobHistory({ customerId, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const { data, isLoading } = useQuery({
    queryKey: ['customerJobs', customerId],
    queryFn: () => jobsApi.getJobs({ customerId, limit: 20 }),
    enabled: !!customerId && isExpanded,
  });

  const jobs = data?.data?.data || data?.data || [];

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Job History</h4>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        isLoading ? (
          <p className="text-xs text-gray-400 py-2">Loading job history...</p>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-1">No job history on record.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${TYPE_STYLES[job.jobType] || TYPE_STYLES.other}`}>
                      {job.jobType === 'bodyworks' ? 'Body Works' : job.jobType}
                    </span>
                    <span className="text-xs font-medium text-gray-800 truncate">{job.problemType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span>{new Date(job.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {job.vehicleRegNumber && (
                      <span className="font-mono font-semibold text-gray-500 bg-white border border-gray-200 px-1 rounded uppercase">
                        {job.vehicleRegNumber}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                  <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[job.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {job.status?.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{fmt(job.totalCost)}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
