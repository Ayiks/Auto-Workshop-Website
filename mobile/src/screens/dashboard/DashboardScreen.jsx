import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { reportsApi } from '../../api/reports';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/common/Card';

const STAT_CARDS = [
  { key: 'totalRevenue',   label: 'Revenue',        icon: 'trending-up',       color: '#059669' },
  { key: 'totalSales',     label: 'Sales',           icon: 'cart',              color: '#d97706' },
  { key: 'activeJobs',     label: 'Active Jobs',     icon: 'construct',         color: '#2563eb' },
  { key: 'pendingInvoices',label: 'Pending Invoices',icon: 'document-text',     color: '#7c3aed' },
];

function formatCurrency(amount, currency = 'GHS') {
  if (amount === null || amount === undefined) return '—';
  const num = parseFloat(amount) || 0;
  return `${currency} ${num.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({ label, icon, color, value, isCurrency, currency }) {
  return (
    <Card style={{ flex: 1, minWidth: '47%' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ backgroundColor: color + '20', borderRadius: 8, padding: 8 }}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 10 }}>
        {value === null ? '—' : isCurrency ? formatCurrency(value, currency) : value}
      </Text>
      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currency = user?.business?.currency || 'GHS';

  const fetchData = useCallback(async () => {
    try {
      const [dashRes] = await Promise.all([
        reportsApi.getDashboard(),
      ]);
      const d = dashRes.data || dashRes;
      setStats(d.stats || d);
      setRecentJobs(d.recentJobs || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#111827', paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 20 }}>
        <Text style={{ color: '#9ca3af', fontSize: 13 }}>{greeting()},</Text>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
          {user?.firstName || 'Manager'} 👋
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
          {user?.business?.name || 'Your Workshop'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
      >
        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <ActivityIndicator size="large" color="#d97706" />
          </View>
        ) : (
          <>
            {/* Stat cards grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {STAT_CARDS.map(({ key, label, icon, color }) => {
                const val = stats?.[key] ?? null;
                const isCurr = ['totalRevenue', 'totalSales'].includes(key);
                return (
                  <StatCard
                    key={key}
                    label={label}
                    icon={icon}
                    color={color}
                    value={val}
                    isCurrency={isCurr}
                    currency={currency}
                  />
                );
              })}
            </View>

            {/* Quick Actions */}
            <Card>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Quick Actions</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { label: 'New Sale',     icon: 'add-circle',  tab: 'Sales',     color: '#059669' },
                  { label: 'New Job',      icon: 'construct',   tab: 'Jobs',      color: '#2563eb' },
                  { label: 'Add Stock',    icon: 'cube',        tab: 'Materials', color: '#d97706' },
                ].map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    onPress={() => navigation.navigate(a.tab)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      backgroundColor: a.color + '10',
                      borderRadius: 10,
                      paddingVertical: 12,
                    }}
                  >
                    <Ionicons name={a.icon} size={24} color={a.color} />
                    <Text style={{ fontSize: 11, color: a.color, fontWeight: '600', marginTop: 4 }}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Recent Jobs */}
            {recentJobs.length > 0 && (
              <Card padding={0}>
                <View style={{ padding: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Recent Jobs</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
                    <Text style={{ fontSize: 12, color: '#d97706', fontWeight: '600' }}>View All</Text>
                  </TouchableOpacity>
                </View>
                {recentJobs.slice(0, 5).map((job, i) => (
                  <View
                    key={job.id}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: '#f3f4f6',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                        {job.title || job.description || 'Job'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>
                        {job.customer?.name || 'Walk-in'}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: job.status === 'completed' ? '#d1fae5' : job.status === 'in_progress' ? '#fef3c7' : '#dbeafe',
                      borderRadius: 100,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '600',
                        color: job.status === 'completed' ? '#065f46' : job.status === 'in_progress' ? '#92400e' : '#1e40af',
                        textTransform: 'capitalize',
                      }}>
                        {(job.status || '').replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
