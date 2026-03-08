import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EmptyState({ icon = 'document-outline', title, message, action }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Ionicons name={icon} size={56} color="#d1d5db" />
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 16, textAlign: 'center' }}>
        {title}
      </Text>
      {message && (
        <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 6, textAlign: 'center' }}>
          {message}
        </Text>
      )}
      {action && <View style={{ marginTop: 16 }}>{action}</View>}
    </View>
  );
}
