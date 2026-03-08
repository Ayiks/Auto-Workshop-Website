import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expensesApi } from '../../api/expenses';
import { useAuthStore } from '../../stores/authStore';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function formatCurrency(amount, currency = 'GHS') {
  const num = parseFloat(amount) || 0;
  return `${currency} ${num.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function AddExpenseModal({ visible, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', amount: '', category: '', description: '', date: '' });
  const [loading, setLoading] = useState(false);
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.title || !form.amount) { Alert.alert('Error', 'Title and amount are required'); return; }
    setLoading(true);
    try {
      await expensesApi.createExpense({
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        date: form.date || new Date().toISOString(),
      });
      onCreated();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add Expense">
      <Input label="Title *" placeholder="e.g. Paint Supplies" value={form.title} onChangeText={set('title')} />
      <Input label="Amount *" placeholder="0.00" value={form.amount} onChangeText={set('amount')} keyboardType="decimal-pad" />
      <Input label="Category" placeholder="e.g. Materials, Utilities" value={form.category} onChangeText={set('category')} />
      <Input label="Description" placeholder="Optional notes..." value={form.description} onChangeText={set('description')} multiline numberOfLines={2} />
      <Button onPress={handleSubmit} loading={loading} fullWidth>Add Expense</Button>
    </Modal>
  );
}

export default function ExpensesScreen({ navigation }) {
  const { user } = useAuthStore();
  const currency = user?.business?.currency || 'GHS';

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await expensesApi.getExpenses();
      const data = res.data || res;
      setExpenses(data.expenses || data.data || data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchExpenses().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  };

  const total = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <ScreenHeader
        title="Expenses"
        subtitle={`Total: ${formatCurrency(total, currency)}`}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={{ backgroundColor: '#d97706', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 3 }}>Add</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
                  {item.category || 'General'} · {new Date(item.date || item.createdAt).toLocaleDateString()}
                </Text>
                {item.description && (
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }} numberOfLines={1}>{item.description}</Text>
                )}
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#dc2626' }}>
                -{formatCurrency(item.amount, currency)}
              </Text>
            </View>
          </Card>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
        ListEmptyComponent={
          !loading && <EmptyState icon="receipt-outline" title="No expenses yet" message="Track your business expenses here." />
        }
      />

      <AddExpenseModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); onRefresh(); }}
      />
    </View>
  );
}
