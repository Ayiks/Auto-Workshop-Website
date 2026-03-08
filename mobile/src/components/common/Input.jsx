import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Input({
  label,
  error,
  secureTextEntry,
  leftIcon,
  rightIcon,
  style,
  containerStyle,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={[{ marginBottom: 14 }, containerStyle]}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? '#dc2626' : '#d1d5db',
          borderRadius: 8,
          backgroundColor: '#f9fafb',
          paddingHorizontal: 12,
        }}
      >
        {leftIcon && (
          <View style={{ marginRight: 8 }}>{leftIcon}</View>
        )}
        <TextInput
          {...props}
          secureTextEntry={isPassword && !showPassword}
          style={[
            {
              flex: 1,
              paddingVertical: 10,
              fontSize: 14,
              color: '#111827',
            },
            style,
          ]}
          placeholderTextColor="#9ca3af"
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && (
          <View style={{ marginLeft: 8 }}>{rightIcon}</View>
        )}
      </View>
      {error && (
        <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>{error}</Text>
      )}
    </View>
  );
}
