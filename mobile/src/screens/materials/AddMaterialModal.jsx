import React, { useState } from 'react';
import { Alert } from 'react-native';
import { materialsApi } from '../../api/materials';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function AddMaterialModal({ visible, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', sku: '', category: '',
    quantity: '', costPrice: '', sellingPrice: '',
    reorderLevel: '5', unitName: 'litre',
  });
  const [loading, setLoading] = useState(false);
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name) { Alert.alert('Error', 'Material name is required'); return; }
    setLoading(true);
    try {
      await materialsApi.createMaterial({
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        category: form.category.trim() || undefined,
        quantity: parseFloat(form.quantity) || 0,
        costPrice: parseFloat(form.costPrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        reorderLevel: parseFloat(form.reorderLevel) || 5,
        unitName: form.unitName.trim() || 'unit',
      });
      onCreated();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add Material">
      <Input label="Material Name *" placeholder="e.g. 2K Clear Coat" value={form.name} onChangeText={set('name')} />
      <Input label="SKU / Code" placeholder="e.g. CLR-2K-001" value={form.sku} onChangeText={set('sku')} />
      <Input label="Category" placeholder="e.g. Clear Coats" value={form.category} onChangeText={set('category')} />
      <Input label="Unit" placeholder="e.g. litre, can, kg" value={form.unitName} onChangeText={set('unitName')} />
      <Input label="Initial Quantity" placeholder="0" value={form.quantity} onChangeText={set('quantity')} keyboardType="decimal-pad" />
      <Input label="Cost Price" placeholder="0.00" value={form.costPrice} onChangeText={set('costPrice')} keyboardType="decimal-pad" />
      <Input label="Selling Price" placeholder="0.00" value={form.sellingPrice} onChangeText={set('sellingPrice')} keyboardType="decimal-pad" />
      <Input label="Reorder Level (low stock alert)" placeholder="5" value={form.reorderLevel} onChangeText={set('reorderLevel')} keyboardType="decimal-pad" />
      <Button onPress={handleSubmit} loading={loading} fullWidth>Add Material</Button>
    </Modal>
  );
}
