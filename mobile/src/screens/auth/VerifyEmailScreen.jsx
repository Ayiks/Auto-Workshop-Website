import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button';

export default function VerifyEmailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { verifyEmail } = useAuthStore();
  const token = route?.params?.token;
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found.');
      return;
    }
    verifyEmail(token)
      .then((res) => {
        setStatus('success');
        // Navigation handled by the store/navigator reacting to isAuthenticated
        if (!res.user.businessId) {
          navigation.replace('SetupWorkspace');
        }
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e.message || 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color="#d97706" />
          <Text style={{ color: '#9ca3af', marginTop: 16, fontSize: 15 }}>Verifying your email...</Text>
        </>
      )}
      {status === 'success' && (
        <>
          <View style={{ width: 72, height: 72, backgroundColor: '#d97706', borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 20 }}>Email Verified!</Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            Setting up your workspace...
          </Text>
        </>
      )}
      {status === 'error' && (
        <>
          <View style={{ width: 72, height: 72, backgroundColor: '#dc2626', borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={40} color="#fff" />
          </View>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 20 }}>Verification Failed</Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8, textAlign: 'center' }}>{message}</Text>
          <Button
            variant="accent"
            onPress={() => navigation.navigate('Login')}
            style={{ marginTop: 24 }}
          >
            Back to Login
          </Button>
        </>
      )}
    </View>
  );
}
