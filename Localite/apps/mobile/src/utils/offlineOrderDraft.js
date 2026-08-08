import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'localite_offline_order_drafts';

export async function listOfflineDrafts() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveDrafts(drafts) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export async function enqueueOfflineDraft(draft) {
  const drafts = await listOfflineDrafts();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...draft,
  };
  drafts.push(entry);
  await saveDrafts(drafts);
  return entry;
}

export async function removeOfflineDraft(id) {
  const drafts = (await listOfflineDrafts()).filter((d) => d.id !== id);
  await saveDrafts(drafts);
}

export async function flushOfflineDrafts(submitFn) {
  const drafts = await listOfflineDrafts();
  if (!drafts.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const remaining = [];

  for (const draft of drafts) {
    try {
      await submitFn(draft);
      sent += 1;
    } catch {
      failed += 1;
      remaining.push(draft);
    }
  }

  await saveDrafts(remaining);
  return { sent, failed, remaining: remaining.length };
}
