import React from 'react';
import { View } from 'react-native';

export default function Card({ children, style, padding = 16 }) {
  return (
    <View
      style={[
        {
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
