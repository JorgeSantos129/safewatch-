import { openDB } from 'idb';

const DB_NAME = 'safewatch';
const DB_VERSION = 1;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('jobs')) {
          const jobs = db.createObjectStore('jobs', { keyPath: 'id' });
          jobs.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('hazards')) {
          const hz = db.createObjectStore('hazards', { keyPath: 'id' });
          hz.createIndex('jobId', 'jobId');
          hz.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));

// ---- Jobs ----
export async function listJobs() {
  const db = await getDB();
  const all = await db.getAll('jobs');
  return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
export async function getJob(id) {
  return (await getDB()).get('jobs', id);
}
export async function saveJob(job) {
  const db = await getDB();
  const now = Date.now();
  const record = { ...job, id: job.id || uid(), createdAt: job.createdAt || now, updatedAt: now };
  await db.put('jobs', record);
  return record;
}
export async function deleteJob(id) {
  const db = await getDB();
  const tx = db.transaction(['jobs', 'hazards', 'images'], 'readwrite');
  const hz = await tx.objectStore('hazards').index('jobId').getAll(id);
  for (const h of hz) {
    if (h.imageId) await tx.objectStore('images').delete(h.imageId);
    await tx.objectStore('hazards').delete(h.id);
  }
  await tx.objectStore('jobs').delete(id);
  await tx.done;
}

// ---- Hazards ----
export async function listHazards(jobId) {
  const db = await getDB();
  const all = await db.getAllFromIndex('hazards', 'jobId', jobId);
  return all.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}
export async function getHazard(id) {
  return (await getDB()).get("hazards", id);
}
export async function saveHazard(hazard) {
  const db = await getDB();
  const now = Date.now();
  const record = { ...hazard, id: hazard.id || uid(), createdAt: hazard.createdAt || now, updatedAt: now };
  await db.put('hazards', record);
  await db.put('jobs', { ...(await db.get('jobs', record.jobId)), updatedAt: now });
  return record;
}
export async function deleteHazard(id) {
  const db = await getDB();
  const h = await db.get('hazards', id);
  if (h?.imageId) await db.delete('images', h.imageId);
  await db.delete('hazards', id);
}

// ---- Images (stored as blobs/dataURLs keyed separately to keep hazard records light) ----
export async function saveImage(dataUrl) {
  const db = await getDB();
  const id = uid();
  await db.put('images', { id, dataUrl });
  return id;
}
export async function getImage(id) {
  if (!id) return null;
  const rec = await (await getDB()).get('images', id);
  return rec?.dataUrl || null;
}
export async function deleteImage(id) {
  if (id) await (await getDB()).delete('images', id);
}

// ---- Bulk ----
export async function clearAll() {
  const db = await getDB();
  const tx = db.transaction(['jobs', 'hazards', 'images'], 'readwrite');
  await Promise.all([
    tx.objectStore('jobs').clear(),
    tx.objectStore('hazards').clear(),
    tx.objectStore('images').clear(),
  ]);
  await tx.done;
}
export async function exportAll() {
  const db = await getDB();
  const [jobs, hazards, images] = await Promise.all([
    db.getAll('jobs'), db.getAll('hazards'), db.getAll('images'),
  ]);
  return { version: DB_VERSION, exportedAt: new Date().toISOString(), jobs, hazards, images };
}
