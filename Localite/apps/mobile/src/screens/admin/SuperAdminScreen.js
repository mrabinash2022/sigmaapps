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
import { ShopCategory, ShopOperationalStatus } from '@localite/shared';
import { api, PAGE_LIMIT } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { createAdminStyles } from '../../theme/adminScreenStyles';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'all', label: 'All Shops' },
  { key: 'create', label: 'Create' },
];

const CATEGORIES = Object.values(ShopCategory);

const STATUS_COLORS = {
  invited: '#6366f1',
  pending: '#f59e0b',
  approved: '#1a7f4b',
  rejected: '#ef4444',
  enabled: '#1a7f4b',
  disabled: '#9ca3af',
  on_hold: '#f97316',
};

function statusBadge(status, operationalStatus) {
  if (status === 'approved') return operationalStatus || 'enabled';
  return status;
}

function previewShopId(name) {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || 'STORE';
  return `SHOP####-${slug}`;
}

const emptyEditForm = {
  name: '',
  category: ShopCategory.GROCERY,
  address: '',
  phone: '',
  itemTypes: '',
  description: '',
  rank: '10',
  areaId: null,
  ownerName: '',
};

export default function SuperAdminScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createAdminStyles(colors), [colors]);
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [allShops, setAllShops] = useState([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [pendingHasMore, setPendingHasMore] = useState(true);
  const [allHasMore, setAllHasMore] = useState(true);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createForm, setCreateForm] = useState({ shopName: '', ownerPhone: '', areaId: null });
  const [newArea, setNewArea] = useState({ name: '', city: '' });
  const [creating, setCreating] = useState(false);
  const [creatingArea, setCreatingArea] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadAreas = async () => {
    try {
      const { areas: areaList } = await api.getAreas();
      setAreas(areaList || []);
      setCreateForm((f) => ({ ...f, areaId: f.areaId || areaList?.[0]?.id || null }));
    } catch (err) {
      console.error('Failed to load areas:', err);
    }
  };

  const fetchShops = async (tabKey, { page = 1, append = false } = {}) => {
    const fetcher = tabKey === 'pending' ? api.getPendingShops : api.getAllShops;
    const res = await fetcher({ page, limit: PAGE_LIMIT });
    const items = res.items || [];
    if (tabKey === 'pending') {
      setPending(append ? (prev) => [...prev, ...items] : items);
      setPendingPage(page);
      setPendingHasMore(res.hasMore ?? false);
    } else {
      setAllShops(append ? (prev) => [...prev, ...items] : items);
      setAllPage(page);
      setAllHasMore(res.hasMore ?? false);
    }
  };

  const loadTab = async (tabKey, { page = 1, append = false, showSpinner = true } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else if (showSpinner) {
      setLoading(true);
    }
    try {
      await fetchShops(tabKey, { page, append });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const reloadAllTabs = async () => {
    setLoading(true);
    await loadAreas();
    try {
      await Promise.all([
        fetchShops('pending', { page: 1 }),
        fetchShops('all', { page: 1 }),
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    setRefreshing(true);
    loadTab(tab, { page: 1, showSpinner: false });
  };

  const loadMore = () => {
    const currentHasMore = tab === 'pending' ? pendingHasMore : allHasMore;
    const currentPage = tab === 'pending' ? pendingPage : allPage;
    if (!loadingMore && currentHasMore && !loading) {
      loadTab(tab, { page: currentPage + 1, append: true, showSpinner: false });
    }
  };

  useFocusEffect(useCallback(() => {
    if (tab !== 'create') loadTab(tab);
  }, [tab]));

  useFocusEffect(useCallback(() => {
    if (tab === 'create') loadAreas();
  }, [tab]));

  const approve = (shopId, name) => {
    Alert.alert('Approve shop', `Approve "${name}"? The shopkeeper will receive SMS, WhatsApp, email, and app notifications.`, [
      { text: 'Cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await api.approveShop(shopId, 10);
            reloadAllTabs();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const reject = (shopId, name) => {
    Alert.prompt('Reject shop', `Reason for rejecting "${name}"`, async (reason) => {
      try {
        await api.rejectShop(shopId, reason || 'Not approved');
        reloadAllTabs();
      } catch (err) {
        Alert.alert('Error', err.message);
      }
    });
  };

  const setOperationalStatus = (shop, nextStatus) => {
    const label = nextStatus.replace('_', ' ');
    Alert.alert('Update shop status', `Set "${shop.name}" to ${label}?`, [
      { text: 'Cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await api.updateShopOperationalStatus(shop.id, nextStatus);
            reloadAllTabs();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const removeShop = (shop) => {
    Alert.alert('Delete shop', `Permanently delete "${shop.name}"?`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteShop(shop.id);
            reloadAllTabs();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const openEdit = (shop) => {
    setEditingShop(shop);
    setEditForm({
      name: shop.name || '',
      category: shop.category || ShopCategory.GROCERY,
      address: shop.address || '',
      phone: shop.phone || '',
      itemTypes: shop.itemTypes || '',
      description: shop.description || '',
      rank: String(shop.rank ?? 10),
      areaId: shop.areaId || shop.area?.id || areas[0]?.id || null,
      ownerName: shop.ownerName || '',
    });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'Shop name is required');
      return;
    }
    if (!editForm.areaId) {
      Alert.alert('Error', 'Please select an area');
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateShop(editingShop.id, {
        name: editForm.name.trim(),
        category: editForm.category,
        address: editForm.address.trim(),
        phone: editForm.phone.trim(),
        itemTypes: editForm.itemTypes.trim() || undefined,
        description: editForm.description.trim() || undefined,
        rank: parseInt(editForm.rank, 10) || 10,
        areaId: editForm.areaId,
        ownerName: editForm.ownerName.trim() || undefined,
      });
      setEditingShop(null);
      reloadAllTabs();
      Alert.alert('Saved', 'Shop details updated');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const createShop = async () => {
    if (!createForm.shopName.trim()) {
      Alert.alert('Error', 'Shop name is required');
      return;
    }
    if (!createForm.ownerPhone.trim()) {
      Alert.alert('Error', 'Shopkeeper phone is required');
      return;
    }
    if (!createForm.areaId) {
      Alert.alert('Error', 'Please select or create an area first');
      return;
    }
    setCreating(true);
    try {
      const res = await api.inviteShop({
        name: createForm.shopName.trim(),
        ownerPhone: createForm.ownerPhone.trim(),
        areaId: createForm.areaId,
      });
      Alert.alert('Shop created', res.message || `Shop ID: ${res.shop?.shopCode || 'assigned'}`);
      setCreateForm({ shopName: '', ownerPhone: '', areaId: areas[0]?.id || null });
      setTab('all');
      reloadAllTabs();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const addArea = async () => {
    if (!newArea.name.trim() || !newArea.city.trim()) {
      Alert.alert('Error', 'Area name and city are required');
      return;
    }
    setCreatingArea(true);
    try {
      const { area } = await api.createArea(newArea.name.trim(), newArea.city.trim());
      await loadAreas();
      setCreateForm((f) => ({ ...f, areaId: area.id }));
      setNewArea({ name: '', city: '' });
      Alert.alert('Area created', `${area.name} added successfully`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCreatingArea(false);
    }
  };

  const renderPendingCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={[styles.badge, { backgroundColor: STATUS_COLORS.pending }]}>
          {item.shopCode || 'pending'}
        </Text>
      </View>
      <Text style={styles.meta}>{item.category} · {item.area?.name}</Text>
      <Text style={styles.meta}>Owner: {item.applicant?.name} ({item.applicant?.phone})</Text>
      {item.applicant?.email ? <Text style={styles.meta}>Email: {item.applicant.email}</Text> : null}
      <Text style={styles.meta}>{item.address}</Text>
      {item.itemTypes ? <Text style={styles.items}>{item.itemTypes}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity style={styles.approveBtn} onPress={() => approve(item.id, item.name)}>
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(item.id, item.name)}>
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAllShopCard = ({ item }) => {
    const badge = statusBadge(item.status, item.operationalStatus);
    const owner = item.applicant || item.staff?.[0];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={[styles.badge, { backgroundColor: STATUS_COLORS[badge] || '#666' }]}>
            {badge}
          </Text>
        </View>
        <Text style={styles.meta}>ID: {item.shopCode || item.id.slice(0, 8)}</Text>
        <Text style={styles.meta}>{item.category} · {item.area?.name || 'No area'}</Text>
        <Text style={styles.meta}>Keeper: {owner?.name || item.ownerName} ({item.phone})</Text>
        <Text style={styles.meta}>{item.address}</Text>

        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.editBtnText}>Edit shop</Text>
        </TouchableOpacity>

        {item.status === 'approved' ? (
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.smallBtn, item.operationalStatus === ShopOperationalStatus.ENABLED && styles.activeBtn]}
              onPress={() => setOperationalStatus(item, ShopOperationalStatus.ENABLED)}
            >
              <Text style={styles.smallBtnText}>Enable</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, item.operationalStatus === ShopOperationalStatus.ON_HOLD && styles.holdBtn]}
              onPress={() => setOperationalStatus(item, ShopOperationalStatus.ON_HOLD)}
            >
              <Text style={styles.smallBtnText}>On hold</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, item.operationalStatus === ShopOperationalStatus.DISABLED && styles.disabledBtn]}
              onPress={() => setOperationalStatus(item, ShopOperationalStatus.DISABLED)}
            >
              <Text style={styles.smallBtnText}>Disable</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeShop(item)}>
          <Text style={styles.deleteText}>Delete shop</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCreateTab = () => (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>Create Shop</Text>
      <Text style={styles.sub}>
        A unique shop ID (e.g. SHOP0001-HEALTHCARE MEDICAL) is generated and the shopkeeper is notified to complete registration.
      </Text>
      <Text style={styles.label}>Shop name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Healthcare Medical"
        placeholderTextColor={colors.textMuted}
        value={createForm.shopName}
        onChangeText={(v) => setCreateForm({ ...createForm, shopName: v })}
      />
      {createForm.shopName.trim() ? (
        <Text style={styles.previewId}>Shop ID preview: {previewShopId(createForm.shopName)}</Text>
      ) : null}
      <Text style={styles.label}>Shopkeeper phone *</Text>
      <TextInput
        style={styles.input}
        placeholder="10-digit mobile number"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        value={createForm.ownerPhone}
        onChangeText={(v) => setCreateForm({ ...createForm, ownerPhone: v })}
      />
      <Text style={styles.label}>Area *</Text>
      {areas.length ? (
        <View style={styles.chips}>
          {areas.map((area) => (
            <TouchableOpacity
              key={area.id}
              style={[styles.chip, createForm.areaId === area.id && styles.chipActive]}
              onPress={() => setCreateForm({ ...createForm, areaId: area.id })}
            >
              <Text style={createForm.areaId === area.id ? styles.chipTextActive : styles.chipText}>
                {area.name} ({area.city})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyArea}>No areas yet. Create one below.</Text>
      )}
      <Text style={styles.label}>Add new area</Text>
      <TextInput
        style={styles.input}
        placeholder="Area name (e.g. Pimple Saudagar)"
        placeholderTextColor={colors.textMuted}
        value={newArea.name}
        onChangeText={(v) => setNewArea({ ...newArea, name: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="City (e.g. Pune)"
        placeholderTextColor={colors.textMuted}
        value={newArea.city}
        onChangeText={(v) => setNewArea({ ...newArea, city: v })}
      />
      <TouchableOpacity style={styles.secondaryBtn} onPress={addArea} disabled={creatingArea}>
        {creatingArea ? <ActivityIndicator color={colors.brand} /> : <Text style={styles.secondaryBtnText}>Add Area</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.approveBtn} onPress={createShop} disabled={creating}>
        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create & Notify Keeper</Text>}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderEditModal = () => (
    <Modal visible={!!editingShop} animationType="slide" onRequestClose={() => setEditingShop(null)}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.heading}>Edit Shop</Text>
          {editingShop?.shopCode ? (
            <Text style={styles.previewId}>Current ID: {editingShop.shopCode}</Text>
          ) : null}
          <Text style={styles.label}>Shop name *</Text>
          <TextInput
            style={styles.input}
            value={editForm.name}
            onChangeText={(v) => setEditForm({ ...editForm, name: v })}
          />
          {editForm.name.trim() ? (
            <Text style={styles.previewId}>
              ID will update to: {previewShopId(editForm.name).replace('####', editingShop?.shopCode?.match(/SHOP(\d{4})/i)?.[1] || '####')}
            </Text>
          ) : null}
          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, editForm.category === cat && styles.chipActive]}
                onPress={() => setEditForm({ ...editForm, category: cat })}
              >
                <Text style={editForm.category === cat ? styles.chipTextActive : styles.chipText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Owner name</Text>
          <TextInput
            style={styles.input}
            value={editForm.ownerName}
            onChangeText={(v) => setEditForm({ ...editForm, ownerName: v })}
          />
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={editForm.phone}
            onChangeText={(v) => setEditForm({ ...editForm, phone: v })}
          />
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={editForm.address}
            onChangeText={(v) => setEditForm({ ...editForm, address: v })}
          />
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
          <Text style={styles.label}>Rank</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={editForm.rank}
            onChangeText={(v) => setEditForm({ ...editForm, rank: v })}
          />
          <Text style={styles.label}>Items / products</Text>
          <TextInput
            style={styles.input}
            value={editForm.itemTypes}
            onChangeText={(v) => setEditForm({ ...editForm, itemTypes: v })}
          />
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            value={editForm.description}
            onChangeText={(v) => setEditForm({ ...editForm, description: v })}
          />
          <View style={styles.row}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => setEditingShop(null)}>
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

      {loading && tab !== 'create' ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>
      ) : tab === 'create' ? (
        renderCreateTab()
      ) : (
        <FlatList
          data={tab === 'pending' ? pending : allShops}
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
              <Text style={styles.heading}>
                {tab === 'pending' ? 'Pending Approvals' : 'All Registered Shops'}
              </Text>
              {tab === 'pending' ? (
                <Text style={styles.sub}>
                  Review new shop requests and tap Approve to activate the store and notify the shopkeeper.
                </Text>
              ) : null}
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.brand} /> : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'pending' ? 'No pending applications' : 'No shops yet'}
            </Text>
          }
          renderItem={tab === 'pending' ? renderPendingCard : renderAllShopCard}
        />
      )}
      {renderEditModal()}
    </View>
  );
}
