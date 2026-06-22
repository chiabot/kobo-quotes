const DB_NAME = "kobo-quotes-db";
const DB_VERSION = 2;
const COVERS_STORE = "covers";
const IMAGES_STORE = "images";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(COVERS_STORE)) {
        db.createObjectStore(COVERS_STORE);
      }
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        db.createObjectStore(IMAGES_STORE);
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllCovers(): Promise<Record<string, string>> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COVERS_STORE, "readonly");
    const store = tx.objectStore(COVERS_STORE);
    const result: Record<string, string> = {};
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        result[cursor.key as string] = cursor.value;
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

export async function setCover(volumeId: string, b64: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COVERS_STORE, "readwrite");
    const req = tx.objectStore(COVERS_STORE).put(b64, volumeId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearCovers(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COVERS_STORE, "readwrite");
    tx.objectStore(COVERS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllImages(): Promise<Record<string, string>> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, "readonly");
    const store = tx.objectStore(IMAGES_STORE);
    const result: Record<string, string> = {};
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        result[cursor.key as string] = cursor.value;
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

export async function setImage(path: string, b64: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, "readwrite");
    const req = tx.objectStore(IMAGES_STORE).put(b64, path);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
