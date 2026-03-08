import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { salesApi } from '../../api/sales';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import NewSaleModal from './NewSaleModal';

function formatCurrency(amount, currency = 'GHS') {
  const num = parseFloat(amount) || 0;
  return `${currency} ${num.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function SaleRow({ sale, currency, onPress }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
              {sale.receiptNumber || sale.id?.slice(0, 8)}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {sale.customer?.name || 'Walk-in Customer'}
            </Text>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
              {new Date(sale.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
              {formatCurrency(sale.total, currency)}
            </Text>
            <StatusBadge status={sale.paymentStatus || sale.status} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currency = user?.business?.currency || 'GHS';

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchSales = useCallback(async (p = 1, q = search) => {
    try {
      const res = await salesApi.getSales({ page: p, limit: 20, search: q });
      const data = res.data || res;
      const list = data.sales || data.data || data;
      if (p === 1) setSales(list);
      else setSales((prev) => [...prev, ...list]);
      setHasMore((data.pagination?.page < data.pagination?.pages) || list.length === 20);
    } catch {}
  }, [search]);

  useEffect(() => {
    setPage(1);
    fetchSales(1, search).finally(() => setLoading(false));
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchSales(1, search);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchSales(next, search);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#111827', paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Sales</Text>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={{ backgroundColor: '#d97706', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7 }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>New Sale</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 10, marginTop: 12 }}>
          <Ionicons name="search" size={16} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search sales..."
            placeholderTextColor="#6b7280"
            style={{ flex: 1, color: '#fff', paddingVertical: 8, marginLeft: 8, fontSize: 13 }}
          />
        </View>
      </View>

      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SaleRow sale={item} currency={currency} onPress={() => {}} />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="cart-outline"
              title="No sales yet"
              message="Tap New Sale to record your first transaction."
            />
          )
        }
      />

      <NewSaleModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); onRefresh(); }}
      />
    </View>
  );
}
