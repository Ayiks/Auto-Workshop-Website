import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

const VARIANTS = {
  primary:   { bg: '#111827', text: '#ffffff' },
  accent:    { bg: '#d97706', text: '#ffffff' },
  outline:   { bg: 'transparent', text: '#111827', border: '#d1d5db' },
  ghost:     { bg: 'transparent', text: '#6b7280' },
  danger:    { bg: '#dc2626', text: '#ffffff' },
};

const SIZES = {
  sm: { px: 12, py: 6, fontSize: 13 },
  md: { px: 16, py: 10, fontSize: 14 },
  lg: { px: 20, py: 14, fontSize: 16 },
};

export default function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        {
          backgroundColor: v.bg,
          paddingHorizontal: s.px,
          paddingVertical: s.py,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: disabled ? 0.5 : 1,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border || 'transparent',
          ...(fullWidth ? { width: '100%' } : {}),
        },
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={v.text} style={{ marginRight: 8 }} />}
      <Text style={{ color: v.text, fontSize: s.fontSize, fontWeight: '600' }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}
