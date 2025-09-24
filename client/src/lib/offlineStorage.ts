import { NavigationRoute } from '../types/navigation';

export interface StoredRoute {
  id: string;
  route: NavigationRoute;
  timestamp: number;
  name?: string;
}

export class OfflineRouteStorage {
  private dbName = 'CampgroundNavigationDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('routes')) {
          const store = db.createObjectStore('routes', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  async saveRoute(routeId: string, route: NavigationRoute, name?: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['routes'], 'readwrite');
      const store = transaction.objectStore('routes');
      
      const storedRoute: StoredRoute = {
        id: routeId,
        route,
        timestamp: Date.now(),
        name: name || `Route to ${route.instructions[route.instructions.length - 1]?.instruction || 'destination'}`
      };

      const request = store.put(storedRoute);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save route'));
    });
  }

  async getRoute(routeId: string): Promise<NavigationRoute | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['routes'], 'readonly');
      const store = transaction.objectStore('routes');
      const request = store.get(routeId);

      request.onsuccess = () => {
        const result = request.result as StoredRoute | undefined;
        resolve(result?.route || null);
      };
      
      request.onerror = () => reject(new Error('Failed to retrieve route'));
    });
  }

  async getAllRoutes(): Promise<StoredRoute[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['routes'], 'readonly');
      const store = transaction.objectStore('routes');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to retrieve routes'));
    });
  }

  async deleteRoute(routeId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['routes'], 'readwrite');
      const store = transaction.objectStore('routes');
      const request = store.delete(routeId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete route'));
    });
  }

  async clearOldRoutes(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) await this.initialize();

    const cutoffTime = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['routes'], 'readwrite');
      const store = transaction.objectStore('routes');
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(new Error('Failed to clear old routes'));
    });
  }

  async getStorageStats(): Promise<{ routeCount: number; estimatedSize: number }> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['routes'], 'readonly');
      const store = transaction.objectStore('routes');
      const request = store.count();

      request.onsuccess = () => {
        const routeCount = request.result;
        // Estimate 50KB per route on average
        const estimatedSize = routeCount * 50 * 1024;
        resolve({ routeCount, estimatedSize });
      };

      request.onerror = () => reject(new Error('Failed to get storage stats'));
    });
  }
}

export const offlineStorage = new OfflineRouteStorage();