import React from 'react';
import { View, Text } from 'react-native';

const COLORS = {
  pending:    { bg: '#fef3c7', text: '#92400e' },
  active:     { bg: '#d1fae5', text: '#065f46' },
  completed:  { bg: '#dbeafe', text: '#1e40af' },
  cancelled:  { bg: '#fee2e2', text: '#991b1b' },
  paid:       { bg: '#d1fae5', text: '#065f46' },
  unpaid:     { bg: '#fef3c7', text: '#92400e' },
  partial:    { bg: '#e0e7ff', text: '#3730a3' },
  in_progress:{ bg: '#fde68a', text: '#92400e' },
  open:       { bg: '#dbeafe', text: '#1e40af' },
  closed:     { bg: '#f3f4f6', text: '#374151' },
  draft:      { bg: '#f3f4f6', text: '#374151' },
  sent:       { bg: '#dbeafe', text: '#1e40af' },
  overdue:    { bg: '#fee2e2', text: '#991b1b' },
};

export default function StatusBadge({ status, label }) {
  const key = (status || '').toLowerCase().replace(' ', '_');
  const colors = COLORS[key] || { bg: '#f3f4f6', text: '#374151' };
  const display = label || status || '';

  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, textTransform: 'capitalize' }}>
        {display.replace('_', ' ')}
      </Text>
    </View>
  );
}
