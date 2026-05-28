import { useState, useEffect } from 'react';
import { offlineSyncService } from '@/lib/offlineSync';
import { getPendingSyncCount } from '@/lib/offlineDb';

export default function OfflinePendingBadge() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getPendingSyncCount().then(setPendingCount);
    return offlineSyncService.subscribe((_status, count) => {
      setPendingCount(count);
    });
  }, []);

  if (pendingCount === 0) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: 'rgba(249,115,22,0.15)',
        color: '#f97316',
        border: '1px solid rgba(249,115,22,0.3)',
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
      {pendingCount} Pending Sync
    </div>
  );
}
