import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { UserAccountStatus, UserRole } from '@localite/shared';
import { api, PAGE_LIMIT } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { createAdminStyles } from '../../theme/adminScreenStyles';

const TABS = [
  { key: 'list', label: 'All Users' },
  { key: 'create', label: 'Create customer' },
];

const ROLE_FILTERS = [
  { key: 'all', label: 'All roles' },
  { key: UserRole.CUSTOMER, label: 'Customers' },
  { key: UserRole.ADMIN, label: 'Store owners' },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'All status' },
  { key: UserAccountStatus.ENABLED, label: 'Enabled' },
  { key: UserAccountStatus.ON_HOLD, label: 'On hold' },
  { key: UserAccountStatus.DISABLED, label: 'Disabled' },
];

const STATUS_COLORS = {
  enabled: '#1a7f4b',
  disabled: '#9ca3af',
  on_hold: '#f97316',
};

const ROLE_LABELS = {
  [UserRole.CUSTOMER]: 'Customer',
  [UserRole.ADMIN]: 'Store owner',
};

const emptyEditForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  areaId: null,
  role: UserRole.CUSTOMER,
};

const emptyCreateForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  address: '',
  areaId: null,
};

export default function SuperAdminUsersScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createAdminStyles(colors), [colors]);
  const [tab, setTab] = useState('list');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  const loadUsers = async ({ nextPage = 1, append = false, showSpinner = true } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else if (showSpinner) {
      setLoading(true);
    }
    try {
      const role = roleFilter === 'all' ? undefined : roleFilter;
      const accountStatus = statusFilter === 'all' ? undefined : statusFilter;
      const res = await api.getAllUsers({ role, accountStatus, page: nextPage, limit: PAGE_LIMIT });
      const items = res.items || [];
      setUsers(append ? (prev) => [...prev, ...items] : items);
      setTotal(res.total ?? items.length);
      setPage(nextPage);
      setHasMore(res.hasMore ?? false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const loadAreas = async () => {
    try {
      const areasRes = await api.getAreas();
      const areaList = areasRes.areas || [];
      setAreas(areaList);
      setCreateForm((f) => ({ ...f, areaId: f.areaId || areaList[0]?.id || null }));
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  useFocusEffect(useCallback(() => {
    if (tab === 'list') {
      loadUsers({ nextPage: 1 });
    }
    loadAreas();
  }, [roleFilter, statusFilter, tab]));

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadUsers({ nextPage: page + 1, append: true, showSpinner: false });
    }
  };

  const refresh = () => {
    setRefreshing(true);
    loadUsers({ nextPage: 1, showSpinner: false });
  };

  const setAccountStatus = (user, nextStatus) => {
    const label = nextStatus.replace('_', ' ');
    Alert.alert('Update account status', `Set "${user.name}" to ${label}?`, [
      { text: 'Cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await api.updateUserAccountStatus(user.id, nextStatus);
            loadUsers({ nextPage: 1 });
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const removeUser = (user) => {
    Alert.alert('Delete user', `Permanently delete "${user.name}"?`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteUser(user.id);
            loadUsers({ nextPage: 1 });
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      areaId: user.areaId || user.area?.id || null,
      role: user.role || UserRole.CUSTOMER,
    });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      Alert.alert('Error', 'Name and phone are required');
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateUser(editingUser.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase() || undefined,
        phone: editForm.phone.trim(),
        address: editForm.address.trim() || undefined,
        areaId: editForm.areaId,
        role: editForm.role,
      });
      setEditingUser(null);
      loadUsers({ nextPage: 1 });
      Alert.alert('Saved', 'User details updated');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const createUser = async () => {
    if (!createForm.name.trim() || !createForm.phone.trim() || !createForm.password) {
      Alert.alert('Error', 'Name, phone, and password are required');
      return;
    }
    setCreating(true);
    try {
      const res = await api.createUser({
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim().toLowerCase() || undefined,
        password: createForm.password,
        address: createForm.address.trim() || undefined,
        areaId: createForm.areaId,
        role: UserRole.CUSTOMER,
      });
      Alert.alert('User created', res.message || 'Customer account created');
      setCreateForm({ ...emptyCreateForm, areaId: areas[0]?.id || null });
      setRoleFilter(UserRole.CUSTOMER);
      setTab('list');
      loadUsers({ nextPage: 1 });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const renderUserCard = ({ item }) => {
    const status = item.accountStatus || (item.isActive ? 'enabled' : 'disabled');
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={[styles.badge, { backgroundColor: STATUS_COLORS[status] || '#666' }]}>
            {status.replace('_', ' ')}
          </Text>
        </View>
        <Text style={styles.meta}>{ROLE_LABELS[item.role] || item.role}</Text>
        <Text style={styles.meta}>Phone: {item.phone}</Text>
        {item.email ? <Text style={styles.meta}>Email: {item.email}</Text> : null}
        <Text style={styles.meta}>{item.area?.name || 'No area'} · {item.address || 'No address'}</Text>
        <Text style={styles.meta}>
          {item.isOnboarded ? 'Onboarded' : 'Not onboarded'}
          {item.lastLoginAt ? ` · Last login: ${new Date(item.lastLoginAt).toLocaleDateString()}` : ''}
        </Text>

        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.editBtnText}>Edit user</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.smallBtn, status === UserAccountStatus.ENABLED && styles.activeBtn]}
            onPress={() => setAccountStatus(item, UserAccountStatus.ENABLED)}
          >
            <Text style={styles.smallBtnText}>Enable</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallBtn, status === UserAccountStatus.ON_HOLD && styles.holdBtn]}
            onPress={() => setAccountStatus(item, UserAccountStatus.ON_HOLD)}
          >
            <Text style={styles.smallBtnText}>On hold</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallBtn, status === UserAccountStatus.DISABLED && styles.disabledBtn]}
            onPress={() => setAccountStatus(item, UserAccountStatus.DISABLED)}
          >
            <Text style={styles.smallBtnText}>Disable</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeUser(item)}>
          <Text style={styles.deleteText}>Delete user</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEditModal = () => (
    <Modal visible={!!editingUser} animationType="slide" onRequestClose={() => setEditingUser(null)}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.heading}>Edit User</Text>
          <Text style={styles.label}>Full name *</Text>
          <TextInput
            style={styles.input}
            value={editForm.name}
            onChangeText={(v) => setEditForm({ ...editForm, name: v })}
          />
          <Text style={styles.label}>Phone *</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={editForm.phone}
            onChangeText={(v) => setEditForm({ ...editForm, phone: v })}
          />
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={editForm.email}
            onChangeText={(v) => setEditForm({ ...editForm, email: v })}
          />
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={editForm.address}
            onChangeText={(v) => setEditForm({ ...editForm, address: v })}
          />
          <Text style={styles.label}>Role</Text>
          <View style={styles.chips}>
            {[UserRole.CUSTOMER, UserRole.ADMIN].map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.chip, editForm.role === role && styles.chipActive]}
                onPress={() => setEditForm({ ...editForm, role })}
              >
                <Text style={editForm.role === role ? styles.chipTextActive : styles.chipText}>
                  {ROLE_LABELS[role]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Area</Text>
          <View style={styles.chips}>
            {areas.map((area) => (
              <TouchableOpacity
                key={area.id}
                style={[styles.chip, editForm.areaId === area.id && styles.chipActive]}
                onPress={() => setEditForm({ ...editForm, areaId: area.id })}
              >
                <Text style={editForm.areaId === area.id ? styles.chipTextActive : styles.chipText}>
                  {area.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => setEditingUser(null)}>
              <Text style={styles.rejectText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveBtn} onPress={saveEdit} disabled={savingEdit}>
              {savingEdit ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderCreateTab = () => (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={styles.heading}>Create customer</Text>
      <Text style={styles.sub}>
        Create a customer account. They can log in with the phone and password you set to browse shops and place orders.
      </Text>

      <Text style={styles.label}>Full name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Customer full name"
        placeholderTextColor={colors.textMuted}
        value={createForm.name}
        onChangeText={(v) => setCreateForm({ ...createForm, name: v })}
      />

      <Text style={styles.label}>Phone *</Text>
      <TextInput
        style={styles.input}
        placeholder="10-digit mobile number"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        value={createForm.phone}
        onChangeText={(v) => setCreateForm({ ...createForm, phone: v })}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="customer@example.com"
        placeholderTextColor={colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        value={createForm.email}
        onChangeText={(v) => setCreateForm({ ...createForm, email: v })}
      />

      <Text style={styles.label}>Initial password *</Text>
      <TextInput
        style={styles.input}
        placeholder="Min 8 chars, upper, lower, number"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={createForm.password}
        onChangeText={(v) => setCreateForm({ ...createForm, password: v })}
      />

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Delivery address"
        placeholderTextColor={colors.textMuted}
        value={createForm.address}
        onChangeText={(v) => setCreateForm({ ...createForm, address: v })}
      />

      <Text style={styles.label}>Area</Text>
      {areas.length ? (
        <View style={styles.chips}>
          {areas.map((area) => (
            <TouchableOpacity
              key={area.id}
              style={[styles.chip, createForm.areaId === area.id && styles.chipActive]}
              onPress={() => setCreateForm({ ...createForm, areaId: area.id })}
            >
              <Text style={createForm.areaId === area.id ? styles.chipTextActive : styles.chipText}>
                {area.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>No areas yet. Create an area from the Shops tab first.</Text>
      )}

      <TouchableOpacity style={styles.approveBtn} onPress={createUser} disabled={creating}>
        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create customer</Text>}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'create' ? (
        renderCreateTab()
      ) : (
        <>
      <View style={styles.filters}>
        {ROLE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, roleFilter === f.key && styles.filterChipActive]}
            onPress={() => setRoleFilter(f.key)}
          >
            <Text style={roleFilter === f.key ? styles.filterTextActive : styles.filterText}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.filters}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text style={statusFilter === f.key ? styles.filterTextActive : styles.filterText}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            <View>
              <Text style={styles.heading}>All Users</Text>
              <Text style={styles.sub}>
                Manage customers and store owners — enable, disable, put on hold, edit, or delete.
                {total > 0 ? ` (${total} total)` : ''}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.brand} /> : null
          }
          ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
          renderItem={renderUserCard}
        />
      )}
      {renderEditModal()}
        </>
      )}
    </View>
  );
}
