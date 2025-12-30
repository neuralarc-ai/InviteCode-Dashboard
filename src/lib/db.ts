import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { 
  WaitlistUser, 
  InviteCode, 
  UserProfile, 
  CreditUsage, 
  CreditPurchase, 
  Subscription, 
  CreditBalance 
} from './types';

interface InviteCodeDB extends DBSchema {
  waitlist: {
    key: string;
    value: WaitlistUser;
    indexes: { 'by-email': string };
  };
  invite_codes: {
    key: string;
    value: InviteCode;
    indexes: { 'by-code': string };
  };
  user_profiles: {
    key: string;
    value: UserProfile;
    indexes: { 'by-user-id': string };
  };
  credit_usage: {
    key: string; // uuid
    value: CreditUsage;
    indexes: { 'by-user-id': string };
  };
  credit_purchases: {
    key: string;
    value: CreditPurchase;
    indexes: { 'by-user-id': string };
  };
  subscriptions: {
    key: string;
    value: Subscription;
    indexes: { 'by-user-id': string };
  };
  credit_balances: {
    key: string; // userId
    value: CreditBalance & { userEmail?: string; userName?: string };
  };
  sync_metadata: {
    key: string; // store name
    value: { store: string; lastSync: number };
  };
}

const DB_NAME = 'invite-code-dashboard-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<InviteCodeDB>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<InviteCodeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Waitlist
        if (!db.objectStoreNames.contains('waitlist')) {
          const store = db.createObjectStore('waitlist', { keyPath: 'id' });
          store.createIndex('by-email', 'email');
        }

        // Invite Codes
        if (!db.objectStoreNames.contains('invite_codes')) {
          const store = db.createObjectStore('invite_codes', { keyPath: 'id' });
          store.createIndex('by-code', 'code');
        }

        // User Profiles
        if (!db.objectStoreNames.contains('user_profiles')) {
          const store = db.createObjectStore('user_profiles', { keyPath: 'id' });
          store.createIndex('by-user-id', 'userId');
        }

        // Credit Usage
        if (!db.objectStoreNames.contains('credit_usage')) {
          const store = db.createObjectStore('credit_usage', { keyPath: 'id' });
          store.createIndex('by-user-id', 'userId');
        }
        
        // Credit Purchases
        if (!db.objectStoreNames.contains('credit_purchases')) {
            const store = db.createObjectStore('credit_purchases', { keyPath: 'id' });
            store.createIndex('by-user-id', 'userId');
        }

        // Subscriptions
        if (!db.objectStoreNames.contains('subscriptions')) {
            const store = db.createObjectStore('subscriptions', { keyPath: 'id' });
            store.createIndex('by-user-id', 'userId');
        }

        // Credit Balances
        if (!db.objectStoreNames.contains('credit_balances')) {
           db.createObjectStore('credit_balances', { keyPath: 'userId' });
        }

        // Sync Metadata
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'store' });
        }
      },
    });
  }
  return dbPromise;
}

export const dbOperations = {
  async getAll<K extends keyof InviteCodeDB>(storeName: K): Promise<InviteCodeDB[K]['value'][]> {
    const db = await getDB();
    return db.getAll(storeName);
  },

  async put<K extends keyof InviteCodeDB>(storeName: K, value: InviteCodeDB[K]['value']) {
    const db = await getDB();
    return db.put(storeName, value);
  },

  async putAll<K extends keyof InviteCodeDB>(storeName: K, values: InviteCodeDB[K]['value'][]) {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await Promise.all([
      ...values.map(v => store.put(v)),
      tx.done
    ]);
  },

  async delete<K extends keyof InviteCodeDB>(storeName: K, key: string) {
    const db = await getDB();
    return db.delete(storeName, key);
  },
  
  async clear<K extends keyof InviteCodeDB>(storeName: K) {
      const db = await getDB();
      return db.clear(storeName);
  },

  async setLastSync(storeName: string, timestamp: number) {
    const db = await getDB();
    await db.put('sync_metadata', { store: storeName, lastSync: timestamp });
  },

  async getLastSync(storeName: string): Promise<number | null> {
    const db = await getDB();
    const meta = await db.get('sync_metadata', storeName);
    return meta ? meta.lastSync : null;
  }
};






