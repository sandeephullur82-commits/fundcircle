import { useCallback } from 'react';
import { offlineDb, addOfflineCollection, addToSyncQueue } from '../offlineDb';
import { offlineSyncService } from '../offlineSync';

export interface CollectionEntry {
  orgId: string;
  agentId: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  notes?: string;
}

export function useOfflineCollection() {
  const saveCollection = useCallback(async (entry: CollectionEntry): Promise<{ success: boolean; localId: string; synced: boolean }> => {
    const localId = crypto.randomUUID();
    const now = Date.now();

    if (navigator.onLine) {
      try {
        await addToSyncQueue({
          action: 'create',
          collection: 'collections',
          payload: { ...entry, localId, syncedFromOffline: false },
          retries: 0,
          createdAt: now,
          status: 'pending',
        });
        await offlineSyncService.startSync();
        return { success: true, localId, synced: true };
      } catch {
        // Fall through to offline save
      }
    }

    await addOfflineCollection({
      localId,
      ...entry,
      status: 'pending',
      createdAt: now,
    });

    return { success: true, localId, synced: false };
  }, []);

  const getPendingCollections = useCallback(async (orgId: string) => {
    return offlineDb.offlineCollections
      .where('orgId').equals(orgId)
      .and(c => c.status === 'pending')
      .toArray();
  }, []);

  return { saveCollection, getPendingCollections };
}
