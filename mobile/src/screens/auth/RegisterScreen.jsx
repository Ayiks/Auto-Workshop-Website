import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { registerUser } = useAuthStore();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    if (!form.firstName || !form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await registerUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });
      Alert.alert(
        'Check Your Email',
        'We sent a verification link to your email address. Please verify before logging in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (e) {
      Alert.alert('Registration Failed', e.message || 'Something went wrong');
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
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 24 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 }}>Create Account</Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input label="First Name *" placeholder="John" value={form.firstName} onChangeText={set('firstName')} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Last Name" placeholder="Doe" value={form.lastName} onChangeText={set('lastName')} />
            </View>
          </View>

          <Input
            label="Email *"
            placeholder="your@email.com"
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Phone"
            placeholder="+233..."
            value={form.phone}
            onChangeText={set('phone')}
            keyboardType="phone-pad"
          />
          <Input
            label="Password *"
            placeholder="Minimum 8 characters"
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
          />
          <Input
            label="Confirm Password *"
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChangeText={set('confirmPassword')}
            secureTextEntry
          />

          <Button onPress={handleRegister} loading={loading} fullWidth style={{ marginTop: 4 }}>
            Create Account
          </Button>

          <TouchableOpacity style={{ alignItems: 'center', marginTop: 20 }} onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>
              Already have an account?{' '}
              <Text style={{ color: '#d97706', fontWeight: '600' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
