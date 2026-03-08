import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { salesApi, customersApi, servicesApi } from '../../api/sales';
import { useAuthStore } from '../../stores/authStore';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function NewSaleModal({ visible, onClose, onCreated }) {
  const { user } = useAuthStore();
  const currency = user?.business?.currency || 'GHS';

  const [customers, setCustomers] = useState([]);
  const [services, setServices]   = useState([]);
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    paymentMethod: 'cash',
    notes: '',
  });
  const [items, setItems] = useState([{ serviceId: '', description: '', quantity: '1', unitPrice: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    Promise.all([servicesApi.getServices(), customersApi.getCustomers()]).then(([svcRes, custRes]) => {
      setServices(svcRes.data || svcRes || []);
      setCustomers(custRes.data || custRes || []);
    }).catch(() => {});
  }, [visible]);

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const addItem = () => setItems((prev) => [...prev, { serviceId: '', description: '', quantity: '1', unitPrice: '' }]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const setItem = (i, key) => (val) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it));

  const total = items.reduce((sum, it) => sum + (parseFloat(it.unitPrice) || 0) * (parseFloat(it.quantity) || 0), 0);

  const handleSubmit = async () => {
    if (items.every((it) => !it.description && !it.serviceId)) {
      Alert.alert('Error', 'Add at least one item');
      return;
    }
    setLoading(true);
    try {
      await salesApi.createSale({
        customerId: form.customerId || undefined,
        customerName: form.customerId ? undefined : form.customerName || 'Walk-in',
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        items: items.filter((it) => it.description || it.serviceId).map((it) => ({
          serviceId: it.serviceId || undefined,
          description: it.description,
          quantity: parseFloat(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
        })),
      });
      onCreated();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  const PAYMENT_METHODS = ['cash', 'card', 'mobile_money', 'bank_transfer', 'cheque'];

  return (
    <Modal visible={visible} onClose={onClose} title="New Sale">
      {/* Customer */}
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>Customer</Text>
      <Input
        placeholder="Walk-in customer name (optional)"
        value={form.customerName}
        onChangeText={setField('customerName')}
        containerStyle={{ marginBottom: 16 }}
      />

      {/* Payment method */}
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>Payment Method</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {PAYMENT_METHODS.map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setField('paymentMethod')(m)}
            style={{
              marginRight: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 100,
              backgroundColor: form.paymentMethod === m ? '#111827' : '#f3f4f6',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: form.paymentMethod === m ? '#fff' : '#374151', textTransform: 'capitalize' }}>
              {m.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Items</Text>
        <TouchableOpacity onPress={addItem}>
          <Ionicons name="add-circle" size={22} color="#d97706" />
        </TouchableOpacity>
      </View>

      {items.map((item, i) => (
        <View key={i} style={{ backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>Item {i + 1}</Text>
            {items.length > 1 && (
              <TouchableOpacity onPress={() => removeItem(i)}>
                <Ionicons name="trash-outline" size={16} color="#dc2626" />
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            placeholder="Description"
            value={item.description}
            onChangeText={setItem(i, 'description')}
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 8, fontSize: 13, backgroundColor: '#fff', marginBottom: 6 }}
            placeholderTextColor="#9ca3af"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              placeholder="Qty"
              value={item.quantity}
              onChangeText={setItem(i, 'quantity')}
              keyboardType="numeric"
              style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 8, fontSize: 13, backgroundColor: '#fff' }}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              placeholder={`Unit Price (${currency})`}
              value={item.unitPrice}
              onChangeText={setItem(i, 'unitPrice')}
              keyboardType="decimal-pad"
              style={{ flex: 2, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 8, fontSize: 13, backgroundColor: '#fff' }}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>
      ))}

      {/* Total */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Total</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#d97706' }}>
          {currency} {total.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
        </Text>
      </View>

      <Input
        label="Notes (optional)"
        placeholder="Any additional notes..."
        value={form.notes}
        onChangeText={setField('notes')}
        multiline
        numberOfLines={2}
      />

      <Button onPress={handleSubmit} loading={loading} fullWidth>
        Record Sale
      </Button>
    </Modal>
  );
}
