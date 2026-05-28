import Dexie, { Table } from 'dexie';

export interface OfflineCollection {
  id?: number;
  localId: string;
  orgId: string;
  agentId: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  notes?: string;
  status: 'pending' | 'synced' | 'failed';
  createdAt: number;
  syncedAt?: number;
}

export interface OfflineCustomer {
  id?: number;
  localId: string;
  orgId: string;
  firestoreId?: string;
  name: string;
  phone?: string;
  address?: string;
  dailyAmount: number;
  balance: number;
  status: 'active' | 'inactive';
  updatedAt: number;
}

export interface OfflineAgent {
  id?: number;
  localId: string;
  orgId: string;
  firestoreId?: string;
  name: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  updatedAt: number;
}

export interface SyncQueueItem {
  id?: number;
  action: 'create' | 'update' | 'delete';
  collection: string;
  docId?: string;
  payload: Record<string, unknown>;
  retries: number;
  createdAt: number;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
}

export interface PendingPayment {
  id?: number;
  localId: string;
  orgId: string;
  customerId: string;
  customerName: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'loan_emi';
  date: string;
  notes?: string;
  status: 'pending' | 'synced' | 'failed';
  createdAt: number;
}

class FundCircleDB extends Dexie {
  offlineCollections!: Table<OfflineCollection>;
  offlineCustomers!: Table<OfflineCustomer>;
  offlineAgents!: Table<OfflineAgent>;
  syncQueue!: Table<SyncQueueItem>;
  pendingPayments!: Table<PendingPayment>;

  constructor() {
    super('FundCircleDB');
    this.version(1).stores({
      offlineCollections: '++id, localId, orgId, agentId, customerId, status, createdAt',
      offlineCustomers: '++id, localId, orgId, firestoreId, status, updatedAt',
      offlineAgents: '++id, localId, orgId, firestoreId, status, updatedAt',
      syncQueue: '++id, action, collection, status, createdAt',
      pendingPayments: '++id, localId, orgId, customerId, status, createdAt',
    });
  }
}

export const offlineDb = new FundCircleDB();

export async function getPendingSyncCount(): Promise<number> {
  const [collections, payments, queueItems] = await Promise.all([
    offlineDb.offlineCollections.where('status').equals('pending').count(),
    offlineDb.pendingPayments.where('status').equals('pending').count(),
    offlineDb.syncQueue.where('status').equals('pending').count(),
  ]);
  return collections + payments + queueItems;
}

export async function addOfflineCollection(data: Omit<OfflineCollection, 'id'>): Promise<number> {
  return offlineDb.offlineCollections.add(data);
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
  return offlineDb.syncQueue.add(item);
}

export async function markCollectionSynced(localId: string): Promise<void> {
  await offlineDb.offlineCollections
    .where('localId').equals(localId)
    .modify({ status: 'synced', syncedAt: Date.now() });
}
