const DB_NAME = "gatelist-offline";
const STORE = "scans";

export interface QueuedScanRecord {
  clientScanId: string;
  eventId: string;
  token: string;
  device: string;
  scannedAt: string;
  outcome?: "VALID" | "DUPLICATE" | "INVALID";
  guestName?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "clientScanId" });
        store.createIndex("eventId", "eventId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueScan(record: QueuedScanRecord): Promise<void> {
  await withStore("readwrite", (store) => store.put(record));
}

export async function updateQueuedOutcome(clientScanId: string, outcome: QueuedScanRecord["outcome"], guestName?: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(clientScanId);
    getReq.onsuccess = () => {
      const record = getReq.result as QueuedScanRecord | undefined;
      if (record) {
        record.outcome = outcome;
        record.guestName = guestName;
        store.put(record);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function listQueuedForEvent(eventId: string): Promise<QueuedScanRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index("eventId");
    const results: QueuedScanRecord[] = [];
    const req = index.openCursor(IDBKeyRange.only(eventId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        results.push(cursor.value as QueuedScanRecord);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueued(clientScanId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(clientScanId));
}

export function newClientScanId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
