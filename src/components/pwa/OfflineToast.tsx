import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { offlineSyncService } from '@/lib/offlineSync';

export default function OfflineToast() {
  const { isOnline, justCameOnline } = useNetworkStatus();
  const wasOnlineRef = useRef(true);

  useEffect(() => {
    if (!isOnline && wasOnlineRef.current) {
      toast.warning('Offline mode enabled', {
        description: 'Collections will be saved locally and synced when back online.',
        duration: 5000,
        id: 'offline-status',
      });
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    if (!justCameOnline) return;
    toast.success('Connection restored', {
      description: 'Syncing your offline data...',
      duration: 3000,
      id: 'online-status',
    });
    offlineSyncService.startSync();
  }, [justCameOnline]);

  useEffect(() => {
    return offlineSyncService.subscribe((status, count) => {
      if (status === 'syncing') {
        toast.loading(`Syncing ${count} item${count !== 1 ? 's' : ''}...`, {
          id: 'sync-status',
          duration: Infinity,
        });
      } else if (status === 'synced') {
        toast.success('All data synced', {
          id: 'sync-status',
          duration: 3000,
        });
      } else if (status === 'error') {
        toast.error(`${count} item${count !== 1 ? 's' : ''} failed to sync`, {
          id: 'sync-status',
          description: 'Will retry automatically.',
          duration: 4000,
        });
      }
    });
  }, []);

  return null;
}
