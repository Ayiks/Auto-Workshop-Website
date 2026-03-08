import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import FinanceScreen from '../finance/FinanceScreen';
import ExpensesScreen from '../expenses/ExpensesScreen';
import SettingsScreen from '../settings/SettingsScreen';
import UsersScreen from '../users/UsersScreen';
import InvoicesScreen from '../invoices/InvoicesScreen';

const Stack = createNativeStackNavigator();

function MoreMenu({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === 'admin';

  const MENU_ITEMS = [
    { label: 'Invoices',   icon: 'document-text',     color: '#7c3aed', screen: 'Invoices'   },
    { label: 'Finance',    icon: 'bar-chart',          color: '#059669', screen: 'Finance'    },
    { label: 'Expenses',   icon: 'receipt',            color: '#dc2626', screen: 'Expenses'   },
    { label: 'Settings',   icon: 'settings',           color: '#374151', screen: 'Settings'   },
    ...(isAdmin ? [{ label: 'Users', icon: 'people', color: '#2563eb', screen: 'Users' }] : []),
  ];

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#111827', paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 20 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>More</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <View style={{ width: 44, height: 44, backgroundColor: '#d97706', borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
              {(user?.firstName || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}>
        {/* Business name card */}
        {user?.business?.name && (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="business" size={20} color="#d97706" style={{ marginRight: 10 }} />
            <View>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>Workspace</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{user.business.name}</Text>
            </View>
          </View>
        )}

        {/* Menu items */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.screen}
              onPress={() => navigation.navigate(item.screen)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: '#f3f4f6',
              }}
            >
              <View style={{ width: 36, height: 36, backgroundColor: item.color + '15', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
        >
          <View style={{ width: 36, height: 36, backgroundColor: '#fee2e2', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
            <Ionicons name="log-out" size={18} color="#dc2626" />
          </View>
          <Text style={{ flex: 1, fontSize: 15, color: '#dc2626', fontWeight: '500' }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default function MoreScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMenu"  component={MoreMenu} />
      <Stack.Screen name="Invoices"  component={InvoicesScreen} />
      <Stack.Screen name="Finance"   component={FinanceScreen} />
      <Stack.Screen name="Expenses"  component={ExpensesScreen} />
      <Stack.Screen name="Settings"  component={SettingsScreen} />
      <Stack.Screen name="Users"     component={UsersScreen} />
    </Stack.Navigator>
  );
}
