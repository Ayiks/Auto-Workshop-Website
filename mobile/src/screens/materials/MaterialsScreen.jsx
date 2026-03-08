import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { materialsApi } from '../../api/materials';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import AddMaterialModal from './AddMaterialModal';

function formatCurrency(amount, currency = 'GHS') {
  const num = parseFloat(amount) || 0;
  return `${currency} ${num.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function MaterialRow({ item, currency, onPress }) {
  const isLow = item.quantity <= (item.reorderLevel || 5);
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                {item.name}
              </Text>
              {isLow && (
                <View style={{ backgroundColor: '#fee2e2', borderRadius: 100, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 10, color: '#dc2626', fontWeight: '600' }}>Low Stock</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {item.category || 'Uncategorized'} · {item.sku || ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
              {item.quantity} {item.unit?.abbreviation || item.unitName || 'units'}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
              {formatCurrency(item.costPrice, currency)} each
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function MaterialsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currency = user?.business?.currency || 'GHS';

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await materialsApi.getMaterials({ search });
      const data = res.data || res;
      setMaterials(data.materials || data.data || data || []);
    } catch {}
  }, [search]);

  useEffect(() => {
    fetchMaterials().finally(() => setLoading(false));
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMaterials();
    setRefreshing(false);
  };

  const stockValue = materials.reduce((s, m) => s + (parseFloat(m.costPrice) || 0) * (parseFloat(m.quantity) || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <View style={{ backgroundColor: '#111827', paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Materials</Text>
            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 1 }}>
              Stock value: {formatCurrency(stockValue, currency)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={{ backgroundColor: '#d97706', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7 }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 10, marginTop: 12 }}>
          <Ionicons name="search" size={16} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search materials..."
            placeholderTextColor="#6b7280"
            style={{ flex: 1, color: '#fff', paddingVertical: 8, marginLeft: 8, fontSize: 13 }}
          />
        </View>
      </View>

      <FlatList
        data={materials}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MaterialRow item={item} currency={currency} onPress={() => {}} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="cube-outline"
              title="No materials yet"
              message="Add paint, materials, and supplies to track your stock."
            />
          )
        }
      />

      <AddMaterialModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); onRefresh(); }}
      />
    </View>
  );
}
