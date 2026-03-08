import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { invoicesApi } from '../../api/jobs';
import { useAuthStore } from '../../stores/authStore';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

function formatCurrency(amount, currency = 'GHS') {
  const num = parseFloat(amount) || 0;
  return `${currency} ${num.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function InvoiceRow({ invoice, currency }) {
  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
            {invoice.invoiceNumber || invoice.id?.slice(0, 8)}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {invoice.customer?.name || invoice.customerName || 'Customer'}
          </Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
            Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
            {formatCurrency(invoice.totalAmount || invoice.total, currency)}
          </Text>
          <StatusBadge status={invoice.status} />
        </View>
      </View>
    </Card>
  );
}

export default function InvoicesScreen({ navigation }) {
  const { user } = useAuthStore();
  const currency = user?.business?.currency || 'GHS';

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await invoicesApi.getInvoices({ search });
      const data = res.data || res;
      setInvoices(data.invoices || data.data || data || []);
    } catch {}
  }, [search]);

  useEffect(() => {
    fetchInvoices().finally(() => setLoading(false));
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <ScreenHeader title="Invoices" onBack={() => navigation.goBack()} />

      <View style={{ backgroundColor: '#111827', paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 10 }}>
          <Ionicons name="search" size={16} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search invoices..."
            placeholderTextColor="#6b7280"
            style={{ flex: 1, color: '#fff', paddingVertical: 8, marginLeft: 8, fontSize: 13 }}
          />
        </View>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InvoiceRow invoice={item} currency={currency} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
        ListEmptyComponent={
          !loading && (
            <EmptyState icon="document-text-outline" title="No invoices found" message="Invoices are created from job cards." />
          )
        }
      />
    </View>
  );
}
