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

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login, loginAsSandbox, error, clearError } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    clearError();
    try {
      await login({ email: form.email.trim().toLowerCase(), password: form.password });
    } catch (e) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    clearError();
    try {
      await loginAsSandbox();
    } catch (e) {
      Alert.alert('Demo Error', e.message || 'Failed to start demo');
    } finally {
      setDemoLoading(false);
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
        {/* Logo / Brand */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View style={{ width: 60, height: 60, backgroundColor: '#d97706', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Ionicons name="car-sport" size={32} color="#fff" />
          </View>
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>Graymanager</Text>
          <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>Auto Paint Workshop Software</Text>
        </View>

        {/* Card */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 }}>Sign In</Text>

          <Input
            label="Email"
            placeholder="your@email.com"
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
          />

          <Button onPress={handleLogin} loading={loading} fullWidth style={{ marginTop: 4 }}>
            Sign In
          </Button>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
            <Text style={{ marginHorizontal: 10, color: '#9ca3af', fontSize: 12 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
          </View>

          <Button variant="outline" onPress={handleDemo} loading={demoLoading} fullWidth>
            Try Live Demo
          </Button>

          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 20 }}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={{ color: '#6b7280', fontSize: 13 }}>
              Don't have an account?{' '}
              <Text style={{ color: '#d97706', fontWeight: '600' }}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
