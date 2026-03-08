import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../stores/authStore';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const ROLES = ['admin', 'manager', 'staff'];

function InviteUserModal({ visible, onClose, onCreated }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'staff' });
  const [loading, setLoading] = useState(false);
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.password) {
      Alert.alert('Error', 'First name, email, and password are required');
      return;
    }
    setLoading(true);
    try {
      await usersApi.createUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
      });
      onCreated();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add Team Member">
      <Input label="First Name *" placeholder="John" value={form.firstName} onChangeText={set('firstName')} />
      <Input label="Last Name" placeholder="Doe" value={form.lastName} onChangeText={set('lastName')} />
      <Input label="Email *" placeholder="john@example.com" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <Input label="Phone" placeholder="+233..." value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Input label="Password *" placeholder="Min 8 characters" value={form.password} onChangeText={set('password')} secureTextEntry />

      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>Role</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => set('role')(r)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: form.role === r ? '#111827' : '#f3f4f6',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: form.role === r ? '#fff' : '#374151', textTransform: 'capitalize' }}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button onPress={handleSubmit} loading={loading} fullWidth>Add Member</Button>
    </Modal>
  );
}

export default function UsersScreen({ navigation }) {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await usersApi.getUsers();
      const data = res.data || res;
      setUsers(data.users || data.data || data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchUsers().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleToggleActive = (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    Alert.alert(
      `${user.isActive ? 'Deactivate' : 'Activate'} User`,
      `Are you sure you want to ${action} ${user.firstName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              if (user.isActive) await usersApi.deactivate(user.id);
              else await usersApi.activate(user.id);
              fetchUsers();
            } catch (e) {
              Alert.alert('Error', e.message || 'Action failed');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <ScreenHeader
        title="Team Members"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={{ backgroundColor: '#d97706', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 3 }}>Add</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: item.isActive ? '#d97706' : '#d1d5db',
                alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                  {(item.firstName || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.email}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
                  <View style={{ backgroundColor: '#f3f4f6', borderRadius: 100, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#374151', textTransform: 'capitalize' }}>{item.role}</Text>
                  </View>
                  <View style={{ backgroundColor: item.isActive ? '#d1fae5' : '#fee2e2', borderRadius: 100, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: item.isActive ? '#065f46' : '#991b1b' }}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
              {item.id !== currentUser?.id && (
                <TouchableOpacity onPress={() => handleToggleActive(item)}>
                  <Ionicons name={item.isActive ? 'pause-circle' : 'play-circle'} size={26} color={item.isActive ? '#6b7280' : '#059669'} />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
        ListEmptyComponent={
          !loading && <EmptyState icon="people-outline" title="No team members" message="Add staff members to collaborate." />
        }
      />

      <InviteUserModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); onRefresh(); }}
      />
    </View>
  );
}
