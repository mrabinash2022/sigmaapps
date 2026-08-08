import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getVisualCatalogTheme } from '@localite/shared';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';
import VisualProductCatalog, { ALL_PRODUCTS_TAB } from '../../components/VisualProductCatalog';
import OrderExtrasPanel from '../../components/OrderExtrasPanel';

export default function CatalogOrderScreen({ route, navigation }) {
  const { shop } = route.params;
  const theme = getVisualCatalogTheme(shop.category);

  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(ALL_PRODUCTS_TAB);
  const [cart, setCart] = useState({});
  const [extraText, setExtraText] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    api.getShopCatalog(shop.id)
      .then((data) => {
        const nextGroups = data.groups || [];
        setGroups(nextGroups);
        setActiveGroup(ALL_PRODUCTS_TAB);
      })
      .catch((err) => setError(err.message || 'Could not load products'))
      .finally(() => setLoading(false));
  };

  useFocusEffect(useCallback(() => { load(); }, [shop.id]));

  const allItems = useMemo(() => groups.flatMap((g) => g.items || []), [groups]);

  const cartEntries = useMemo(
    () => Object.entries(cart).filter(([, qty]) => qty > 0),
    [cart],
  );

  const cartTotal = useMemo(() => {
    let total = 0;
    for (const [itemId, qty] of cartEntries) {
      const item = allItems.find((i) => i.id === itemId);
      if (item) total += Number(item.price) * qty;
    }
    return total;
  }, [cartEntries, allItems]);

  const cartCount = cartEntries.reduce((sum, [, qty]) => sum + qty, 0);
  const productCount = allItems.length;
  const hasExtras = Boolean(extraText.trim() || imageUri);
  const canSubmit = cartCount > 0 || hasExtras;
  const isClosed = shop.storeInfo?.status && !shop.storeInfo.status.isOpen;

  const addItem = (itemId) => {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeItem = (itemId) => {
    setCart((prev) => {
      const next = { ...prev, [itemId]: Math.max(0, (prev[itemId] || 0) - 1) };
      if (!next[itemId]) delete next[itemId];
      return next;
    });
  };

  const submit = async () => {
    if (isClosed) {
      Alert.alert('Shop closed', shop.storeInfo?.status?.label || 'This shop is not accepting orders right now.');
      return;
    }
    if (!canSubmit) {
      Alert.alert('Add items', 'Select products, type a list, or upload a photo to place your order.');
      return;
    }

    const items = cartEntries.map(([itemId, quantity]) => {
      const item = allItems.find((i) => i.id === itemId);
      return {
        catalogItemId: itemId,
        name: item.name,
        quantity,
        unitPrice: item.price,
        sizeLabel: item.sizeLabel,
        unit: item.unit,
        imageUrl: item.imageUrl,
      };
    });

    setSubmitting(true);
    try {
      const { order } = await api.submitVisualOrder(shop.id, {
        items,
        extraText: extraText.trim(),
        note: note.trim(),
        imageUri,
      });
      Alert.alert('Order placed!', 'Your shopkeeper will review your order.');
      navigation.replace('OrderDetail', { orderId: order.id });
    } catch (err) {
      Alert.alert('Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View style={[styles.hero, { backgroundColor: theme.light }]}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={[styles.heroSub, { color: theme.accent }]}>{theme.label}</Text>
          {isClosed ? (
            <Text style={styles.closedBanner}>{shop.storeInfo.status.label}</Text>
          ) : null}
          {productCount > 0 ? (
            <Text style={styles.itemCount}>{productCount} products with prices</Text>
          ) : null}
        </View>

        <VisualProductCatalog
          groups={groups}
          activeGroup={activeGroup}
          onSelectGroup={setActiveGroup}
          cart={cart}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          accent={theme.accent}
          loading={loading}
          error={error}
          onRetry={load}
          ListFooterComponent={(
            <View>
              <OrderExtrasPanel
                extraText={extraText}
                onExtraTextChange={setExtraText}
                imageUri={imageUri}
                onImageChange={setImageUri}
                note={note}
                onNoteChange={setNote}
                accent={theme.accent}
              />
              <View style={{ height: canSubmit ? 88 : 16 }} />
            </View>
          )}
        />

        {canSubmit && (
          <View style={[styles.cartBar, { borderColor: theme.accent }]}>
            <View style={styles.cartSummary}>
              {cartCount > 0 ? (
                <>
                  <Text style={styles.cartCount}>{cartCount} product{cartCount === 1 ? '' : 's'} selected</Text>
                  <Text style={[styles.cartTotal, { color: theme.accent }]}>Est. ₹{cartTotal.toFixed(0)}</Text>
                </>
              ) : (
                <Text style={styles.cartCount}>Custom list only</Text>
              )}
              {hasExtras ? <Text style={styles.extraHint}>+ text or photo added</Text> : null}
            </View>
            <TouchableOpacity
              style={[styles.placeBtn, { backgroundColor: theme.accent }]}
              onPress={submit}
              disabled={submitting || isClosed}
            >
              <Text style={styles.placeBtnText}>{submitting ? 'Placing…' : 'Place order'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf9' },
  hero: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  shopName: { fontSize: 22, fontWeight: '800', color: '#111' },
  closedBanner: { fontSize: 13, color: '#b91c1c', fontWeight: '700', marginTop: 6 },
  heroSub: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  itemCount: { fontSize: 12, color: '#666', marginTop: 6, fontWeight: '600' },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cartSummary: { flex: 1, marginRight: 12 },
  cartCount: { fontSize: 13, color: '#666' },
  cartTotal: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  extraHint: { fontSize: 11, color: '#888', marginTop: 2 },
  placeBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10 },
  placeBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
