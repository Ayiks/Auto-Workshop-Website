import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function ProfileModal({ visible, onClose, user }) {
  const { setUser } = useAuthStore();
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [loading, setLoading] = useState(false);
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await authApi.updateProfile({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim() });
      const updated = res.data || res;
      await setUser({ ...user, ...updated });
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Edit Profile">
      <Input label="First Name" value={form.firstName} onChangeText={set('firstName')} />
      <Input label="Last Name" value={form.lastName} onChangeText={set('lastName')} />
      <Input label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Button onPress={handleSave} loading={loading} fullWidth>Save Changes</Button>
    </Modal>
  );
}

function ChangePasswordModal({ visible, onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (form.newPassword !== form.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (form.newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      Alert.alert('Success', 'Password changed successfully');
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Change Password">
      <Input label="Current Password" value={form.currentPassword} onChangeText={set('currentPassword')} secureTextEntry />
      <Input label="New Password" value={form.newPassword} onChangeText={set('newPassword')} secureTextEntry />
      <Input label="Confirm New Password" value={form.confirmPassword} onChangeText={set('confirmPassword')} secureTextEntry />
      <Button onPress={handleSave} loading={loading} fullWidth>Change Password</Button>
    </Modal>
  );
}

function MenuItem({ icon, label, onPress, color = '#374151', danger }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
      }}
    >
      <Ionicons name={icon} size={20} color={danger ? '#dc2626' : color} style={{ marginRight: 14 }} />
      <Text style={{ flex: 1, fontSize: 15, color: danger ? '#dc2626' : '#111827', fontWeight: '500' }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const { user } = useAuthStore();
  const [showProfile, setShowProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }}>
        {/* Profile section */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header row */}
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <View style={{ width: 52, height: 52, backgroundColor: '#d97706', borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>
                {(user?.firstName || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>{user?.email}</Text>
              <View style={{ backgroundColor: '#f3f4f6', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', textTransform: 'capitalize' }}>{user?.role}</Text>
              </View>
            </View>
          </View>
          <MenuItem icon="person-outline" label="Edit Profile" onPress={() => setShowProfile(true)} />
          <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => setShowPassword(true)} />
        </View>

        {/* Business */}
        {user?.business && (
          <Card>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Business</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{user.business.name}</Text>
            {user.business.phone && (
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{user.business.phone}</Text>
            )}
            {user.business.address && (
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{user.business.address}</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>Currency</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{user.business.currency || 'GHS'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>Plan</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' }}>{user.business.plan || 'starter'}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* App info */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>App Version</Text>
            <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>1.0.0</Text>
          </View>
        </Card>
      </ScrollView>

      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} user={user} />
      <ChangePasswordModal visible={showPassword} onClose={() => setShowPassword(false)} />
    </View>
  );
}
