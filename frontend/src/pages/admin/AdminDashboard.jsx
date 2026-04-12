import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Building2, Users, CreditCard, TrendingUp, AlertTriangle,
  UserCheck, UserX, BuildingIcon,
} from 'lucide-react';
import { adminApi } from '@api/admin';

function StatCard({ label, value, icon: Icon, color = 'indigo', sub }) {
  const colors = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    green: 'bg-green-500/10 text-green-400',
    amber: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
    blue: 'bg-blue-500/10 text-blue-400',
    gray: 'bg-gray-700/50 text-gray-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-white text-2xl font-bold">{value ?? '—'}</p>
          {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

const planBadge = (plan) => (
  <span
    className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${
      plan === 'pro' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-700 text-gray-400'
    }`}
  >
    {plan}
  </span>
);

const statusBadge = (status) => {
  const styles = {
    active: 'bg-green-500/20 text-green-300',
    pending: 'bg-amber-500/20 text-amber-300',
    cancelled: 'bg-red-500/20 text-red-300',
  };
  return (
    <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-700 text-gray-400'}`}>
      {status}
    </span>
  );
};

// Build monthly bar chart data from recentBusinesses
function buildChartData(businesses) {
  const counts = {};
  businesses.forEach((b) => {
    const month = format(new Date(b.createdAt), 'MMM yyyy');
    counts[month] = (counts[month] || 0) + 1;
  });

  // Generate last 6 months labels
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(format(d, 'MMM yyyy'));
  }

  return months.map((m) => ({ month: m.split(' ')[0], count: counts[m] || 0 }));
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
    staleTime: 30_000,
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          Failed to load stats: {error.message}
        </div>
      </div>
    );
  }

  const chartData = buildChartData(stats?.recentBusinesses || []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-xl font-bold">System Overview</h1>
        <p className="text-gray-500 text-sm mt-0.5">Platform-wide metrics and activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Businesses" value={stats?.totalBusinesses} icon={Building2} color="indigo" />
        <StatCard label="Active Businesses" value={stats?.activeBusinesses} icon={BuildingIcon} color="green"
          sub={`${stats?.inactiveBusinesses} inactive`} />
        <StatCard label="Pro Plan" value={stats?.proPlanCount} icon={CreditCard} color="blue"
          sub={`${stats?.freePlanCount} on free`} />
        <StatCard label="Active Subscriptions" value={stats?.activeSubscriptions} icon={TrendingUp} color="green" />
        <StatCard label="Total Users" value={stats?.totalUsers} icon={Users} color="indigo" />
        <StatCard label="Active Users" value={stats?.activeUsers} icon={UserCheck} color="green"
          sub={`${stats?.inactiveUsers} inactive`} />
        <StatCard label="Inactive Users" value={stats?.inactiveUsers} icon={UserX} color="gray" />
        <StatCard
          label="Unresolved Errors"
          value={stats?.unresolvedErrors}
          icon={AlertTriangle}
          color={stats?.unresolvedErrors > 0 ? 'red' : 'green'}
          sub={stats?.unresolvedErrors > 0 ? 'Needs attention' : 'All clear'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white text-sm font-semibold mb-4">New Businesses (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#e5e7eb' }}
                itemStyle={{ color: '#818cf8' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Businesses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Businesses */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white text-sm font-semibold mb-4">Recently Joined Businesses</h2>
          <div className="space-y-2 overflow-y-auto max-h-[220px]">
            {stats?.recentBusinesses?.length === 0 && (
              <p className="text-gray-500 text-sm">No businesses yet.</p>
            )}
            {stats?.recentBusinesses?.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                <div>
                  <p className="text-gray-200 text-sm font-medium">{b.name}</p>
                  <p className="text-gray-500 text-[11px]">
                    {b._count?.users ?? 0} users · {format(new Date(b.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {planBadge(b.plan)}
                  {statusBadge(b.subscriptionStatus)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
