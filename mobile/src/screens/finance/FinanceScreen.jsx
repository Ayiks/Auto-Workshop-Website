import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportsApi } from '../../api/reports';
import { useAuthStore } from '../../stores/authStore';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';

function formatCurrency(amount, currency = 'GHS') {
  const num = parseFloat(amount) || 0;
  return `${currency} ${num.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

const PERIODS = [
  { label: 'Today',    value: 'today'   },
  { label: 'Week',     value: 'week'    },
  { label: 'Month',    value: 'month'   },
  { label: '3 Months', value: '3months' },
  { label: 'Year',     value: 'year'    },
];

function StatRow({ label, value, color = '#111827' }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
      <Text style={{ fontSize: 13, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color }}>{value}</Text>
    </View>
  );
}

export default function FinanceScreen({ navigation }) {
  const { user } = useAuthStore();
  const currency = user?.business?.currency || 'GHS';

  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await reportsApi.getProfitLoss({ period });
      setData(res.data || res);
    } catch {}
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchReport().finally(() => setLoading(false));
  }, [period]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReport();
    setRefreshing(false);
  };

  const stats = data?.summary || data || {};

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <ScreenHeader title="Finance & Reports" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
      >
        {/* Period picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.value}
                onPress={() => setPeriod(p.value)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 100,
                  backgroundColor: period === p.value ? '#111827' : '#fff',
                  borderWidth: 1,
                  borderColor: period === p.value ? '#111827' : '#e5e7eb',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: period === p.value ? '#fff' : '#374151' }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <ActivityIndicator size="large" color="#d97706" />
          </View>
        ) : (
          <>
            {/* Revenue overview */}
            <Card>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Revenue Overview</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#059669', marginBottom: 12 }}>
                {formatCurrency(stats.totalRevenue || stats.revenue, currency)}
              </Text>
              <StatRow label="Sales Revenue" value={formatCurrency(stats.salesRevenue || stats.salesTotal, currency)} />
              <StatRow label="Job Revenue" value={formatCurrency(stats.jobRevenue || stats.jobsTotal, currency)} />
              <StatRow label="Total Expenses" value={formatCurrency(stats.totalExpenses || stats.expenses, currency)} color="#dc2626" />
              <StatRow
                label="Net Profit"
                value={formatCurrency(
                  (parseFloat(stats.totalRevenue || stats.revenue) || 0) - (parseFloat(stats.totalExpenses || stats.expenses) || 0),
                  currency
                )}
                color="#059669"
              />
            </Card>

            {/* Payments */}
            <Card>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Payment Stats</Text>
              <StatRow label="Total Paid" value={formatCurrency(stats.paidAmount || stats.totalPaid, currency)} color="#059669" />
              <StatRow label="Outstanding" value={formatCurrency(stats.unpaidAmount || stats.totalUnpaid, currency)} color="#dc2626" />
              <StatRow label="Partial Payments" value={formatCurrency(stats.partialAmount, currency)} />
            </Card>

            {/* Jobs */}
            <Card>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Job Stats</Text>
              <StatRow label="Total Jobs" value={stats.totalJobs || '0'} />
              <StatRow label="Completed" value={stats.completedJobs || '0'} color="#059669" />
              <StatRow label="In Progress" value={stats.inProgressJobs || '0'} color="#d97706" />
              <StatRow label="Open" value={stats.openJobs || '0'} />
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}
