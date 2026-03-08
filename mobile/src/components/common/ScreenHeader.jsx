import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ScreenHeader({ title, onBack, rightAction, subtitle }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: '#111827',
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{title}</Text>
          {subtitle && (
            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 1 }}>{subtitle}</Text>
          )}
        </View>
        {rightAction && <View>{rightAction}</View>}
      </View>
    </View>
  );
}
