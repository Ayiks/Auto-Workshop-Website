import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { jobsApi } from '../../api/jobs';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import NewJobModal from './NewJobModal';

const STATUS_FILTERS = ['all', 'open', 'in_progress', 'completed', 'cancelled'];

function JobRow({ job, currency, onPress }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
              {job.title || job.description || 'Job Card'}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {job.customer?.name || 'Walk-in'} · {job.vehicleInfo || ''}
            </Text>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
              {new Date(job.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <StatusBadge status={job.status} />
        </View>
        {job.jobNumber && (
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>#{job.jobNumber}</Text>
        )}
      </Card>
    </TouchableOpacity>
  );
}

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currency = user?.business?.currency || 'GHS';

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const params = { search, ...(statusFilter !== 'all' ? { status: statusFilter } : {}) };
      const res = await jobsApi.getJobs(params);
      const data = res.data || res;
      setJobs(data.jobs || data.data || data || []);
    } catch {}
  }, [search, statusFilter]);

  useEffect(() => {
    fetchJobs().finally(() => setLoading(false));
  }, [search, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <View style={{ backgroundColor: '#111827', paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Jobs</Text>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={{ backgroundColor: '#d97706', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7 }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>New Job</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 10, marginTop: 12 }}>
          <Ionicons name="search" size={16} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search jobs..."
            placeholderTextColor="#6b7280"
            style={{ flex: 1, color: '#fff', paddingVertical: 8, marginLeft: 8, fontSize: 13 }}
          />
        </View>
      </View>

      {/* Status filters */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setStatusFilter(item)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderRadius: 100,
                backgroundColor: statusFilter === item ? '#111827' : '#f3f4f6',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: statusFilter === item ? '#fff' : '#374151', textTransform: 'capitalize' }}>
                {item.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobRow job={item} currency={currency} onPress={() => {}} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="construct-outline"
              title="No jobs found"
              message="Create a job card to track workshop work."
            />
          )
        }
      />

      <NewJobModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); onRefresh(); }}
      />
    </View>
  );
}
