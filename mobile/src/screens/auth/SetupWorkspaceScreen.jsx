import React, { useState } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'NGN'];
const TIMEZONES  = ['Africa/Accra', 'Africa/Lagos', 'America/New_York', 'Europe/London', 'Asia/Dubai'];

export default function SetupWorkspaceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setupWorkspace } = useAuthStore();
  const [form, setForm] = useState({
    businessName: '',
    phone: '',
    address: '',
    currency: 'GHS',
    timezone: 'Africa/Accra',
    taxRate: '0',
  });
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSetup = async () => {
    if (!form.businessName) {
      Alert.alert('Error', 'Business name is required');
      return;
    }
    setLoading(true);
    try {
      await setupWorkspace({
        businessName: form.businessName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        currency: form.currency,
        timezone: form.timezone,
        taxRate: parseFloat(form.taxRate) || 0,
      });
    } catch (e) {
      Alert.alert('Setup Failed', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#111827' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 28 }}>
          <Text style={{ color: '#d97706', fontSize: 13, fontWeight: '600', marginBottom: 4 }}>ONE MORE STEP</Text>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>Set Up Your Workspace</Text>
          <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 6 }}>Tell us about your business to get started.</Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24 }}>
          <Input
            label="Business Name *"
            placeholder="e.g. Kofi Auto Paint"
            value={form.businessName}
            onChangeText={set('businessName')}
          />
          <Input
            label="Business Phone"
            placeholder="+233..."
            value={form.phone}
            onChangeText={set('phone')}
            keyboardType="phone-pad"
          />
          <Input
            label="Address"
            placeholder="Street, City, Region"
            value={form.address}
            onChangeText={set('address')}
            multiline
            numberOfLines={2}
          />

          {/* Currency picker row */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>Currency</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CURRENCIES.map((c) => (
                <Button
                  key={c}
                  variant={form.currency === c ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => set('currency')(c)}
                >
                  {c}
                </Button>
              ))}
            </View>
          </View>

          <Input
            label="Default Tax Rate (%)"
            placeholder="0"
            value={form.taxRate}
            onChangeText={set('taxRate')}
            keyboardType="decimal-pad"
          />

          <Button onPress={handleSetup} loading={loading} fullWidth style={{ marginTop: 8 }}>
            Launch My Workspace
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
