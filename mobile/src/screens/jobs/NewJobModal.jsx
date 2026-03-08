import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { jobsApi } from '../../api/jobs';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];

export default function NewJobModal({ visible, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    customerName: '',
    customerPhone: '',
    vehicleInfo: '',
    status: 'open',
    estimatedCost: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.title && !form.description) {
      Alert.alert('Error', 'Please provide a job title or description');
      return;
    }
    setLoading(true);
    try {
      await jobsApi.createJob({
        title: form.title.trim(),
        description: form.description.trim(),
        customerName: form.customerName.trim() || undefined,
        customerPhone: form.customerPhone.trim() || undefined,
        vehicleInfo: form.vehicleInfo.trim() || undefined,
        status: form.status,
        estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
        notes: form.notes.trim() || undefined,
      });
      onCreated();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="New Job Card">
      <Input label="Job Title *" placeholder="e.g. Full Body Respray" value={form.title} onChangeText={set('title')} />
      <Input label="Description" placeholder="Details about the job..." value={form.description} onChangeText={set('description')} multiline numberOfLines={2} />
      <Input label="Customer Name" placeholder="Customer's name" value={form.customerName} onChangeText={set('customerName')} />
      <Input label="Customer Phone" placeholder="+233..." value={form.customerPhone} onChangeText={set('customerPhone')} keyboardType="phone-pad" />
      <Input label="Vehicle Info" placeholder="e.g. Toyota Camry 2019 Silver" value={form.vehicleInfo} onChangeText={set('vehicleInfo')} />

      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => set('status')(s)}
            style={{
              marginRight: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 100,
              backgroundColor: form.status === s ? '#111827' : '#f3f4f6',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: form.status === s ? '#fff' : '#374151', textTransform: 'capitalize' }}>
              {s.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Input label="Estimated Cost" placeholder="0.00" value={form.estimatedCost} onChangeText={set('estimatedCost')} keyboardType="decimal-pad" />
      <Input label="Notes" placeholder="Any additional notes..." value={form.notes} onChangeText={set('notes')} multiline numberOfLines={2} />

      <Button onPress={handleSubmit} loading={loading} fullWidth>
        Create Job
      </Button>
    </Modal>
  );
}
