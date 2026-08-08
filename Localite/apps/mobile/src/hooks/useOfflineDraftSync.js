import { useCallback, useEffect, useState } from 'react';
import { AppState, Alert } from 'react-native';
import { api } from '../services/api';
import { flushOfflineDrafts, listOfflineDrafts } from '../utils/offlineOrderDraft';

export function useOfflineDraftSync({ enabled = true, onSynced } = {}) {
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(async () => {
    const drafts = await listOfflineDrafts();
    setPendingCount(drafts.length);
  }, []);

  const syncDrafts = useCallback(async ({ silent = false } = {}) => {
    const result = await flushOfflineDrafts(async (draft) => {
      await api.submitOrder(draft.shopId, draft.textPayload, draft.imageUri, {
        addressId: draft.addressId,
        scheduledWindow: draft.scheduledWindow,
      });
    });

    await refreshCount();
    if (result.sent > 0 && !silent) {
      Alert.alert('Orders sent', `${result.sent} queued order(s) were submitted.`);
    }
    if (result.sent > 0) onSynced?.(result);
    return result;
  }, [onSynced, refreshCount]);

  useEffect(() => {
    if (!enabled) return undefined;
    refreshCount();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncDrafts({ silent: true }).catch(() => {});
    });
    syncDrafts({ silent: true }).catch(() => {});
    return () => sub.remove();
  }, [enabled, refreshCount, syncDrafts]);

  return { pendingCount, syncDrafts, refreshCount };
}
