import { Project, User as AppUser, ApprovalRequest } from '../types';
import { db, auth } from './firebase';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let syncSuspendedState = false;

export function isSyncSuspended(): boolean {
  return syncSuspendedState;
}

export async function reactivateSync(): Promise<void> {
  syncSuspendedState = false;
}

/**
 * Robust, self-healing project sync function that handles Firebase Cloud Firestore & REST Backend Sync.
 */
export async function safeSyncProject(proj: Project, isBackgroundQueueSync = false): Promise<void> {
  if (!proj.lastModifiedAt) {
    proj.lastModifiedAt = new Date().toISOString();
  }

  // Clear from deleted IDs set if re-created or updated
  try {
    const deletedStr = localStorage.getItem('era_deleted_project_ids') || '[]';
    const deletedIds: string[] = JSON.parse(deletedStr);
    if (deletedIds.includes(proj.id)) {
      const filtered = deletedIds.filter(id => id !== proj.id);
      localStorage.setItem('era_deleted_project_ids', JSON.stringify(filtered));
    }
  } catch {}

  // Emit event for Drive Auto-Sync to pick up
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('local_project_mutated'));
  }

  // Firestore Sync
  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'projects', proj.id), {
        id: proj.id,
        name: proj.name || '',
        client: proj.client || '',
        consultant: proj.consultant || '',
        contractor: proj.contractor || '',
        signDate: proj.signDate || '',
        startDate: proj.startDate || '',
        origDays: String(proj.origDays || 0),
        eotDays: String(proj.eotDays || 0),
        variation: String(proj.variation || 0),
        origAmount: String(proj.origAmount || 0),
        lengthKm: String(proj.lengthKm || 0),
        classification: proj.classification || '',
        contractType: proj.contractType || '',
        programDirectorate: proj.programDirectorate || '',
        pmo: proj.pmo || '',
        physicalProgress: String(proj.physicalProgress || 0),
        provisionalSum: String(proj.provisionalSum || 0),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (fsErr) {
      console.warn('Firestore sync failed:', fsErr);
    }
  }

  // Relational Database Sync: custom Express REST API (/api/projects/sync)
  const sqlSyncPromise = (async () => {
    if (!proj.id || typeof proj.id !== 'string') {
      throw new Error("Client Validation Failed: Project ID must be a non-empty string.");
    }
    if (!proj.name || typeof proj.name !== 'string' || proj.name.trim() === '') {
      throw new Error("Client Validation Failed: Project Name is required.");
    }
    if (!proj.client || typeof proj.client !== 'string' || proj.client.trim() === '') {
      throw new Error("Client Validation Failed: Client Name is required.");
    }

    const response = await fetch('/api/projects/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proj)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${response.status} Server Error`);
    }

    // Clean from offline queue if present
    try {
      const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
      const queue: Project[] = JSON.parse(queueStr);
      const filtered = queue.filter(p => p.id !== proj.id);
      localStorage.setItem('era_offline_sync_queue', JSON.stringify(filtered));
    } catch {}

    console.log('Project successfully synchronized with backend REST API.');
  })();

  try {
    await sqlSyncPromise;
  } catch (error: any) {
    console.warn('Backend REST DB Sync failed/offline:', error.message || error);
    if (isBackgroundQueueSync) {
      throw error;
    }
    try {
      const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
      const queue: Project[] = JSON.parse(queueStr);
      if (!queue.some(p => p.id === proj.id)) {
        queue.push(proj);
        localStorage.setItem('era_offline_sync_queue', JSON.stringify(queue));
      }
    } catch (e) {
      console.error('Failed to write to offline sync queue:', e);
    }
  }
}

/**
 * Deletes a project from standalone Express backend and Firestore.
 */
export async function safeDeleteProject(id: string): Promise<void> {
  // Store deleted ID locally so real-time listeners don't resurrect it
  try {
    const deletedStr = localStorage.getItem('era_deleted_project_ids') || '[]';
    const deletedIds: string[] = JSON.parse(deletedStr);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('era_deleted_project_ids', JSON.stringify(deletedIds));
    }

    // Clean from offline sync queue
    const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
    const queue: Project[] = JSON.parse(queueStr);
    const filteredQueue = queue.filter(p => p.id !== id);
    localStorage.setItem('era_offline_sync_queue', JSON.stringify(filteredQueue));
  } catch (err) {
    console.warn('Failed to track deleted project ID locally:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('local_project_mutated'));
  }

  const syncPromises: Promise<any>[] = [];

  // Delete from Firestore
  if (auth.currentUser) {
    syncPromises.push(
      deleteDoc(doc(db, 'projects', id)).catch(fsErr => handleFirestoreError(fsErr, OperationType.DELETE, `projects/${id}`))
    );
  }

  // Delete from relational REST API backend
  syncPromises.push(
    fetch(`/api/projects/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) console.log('Project deleted from backend DB:', id);
      })
      .catch(err => console.warn('Backend delete warning:', err))
  );

  syncPromises.push(
    fetch(`/api/projects/sync/${id}`, { method: 'DELETE' })
      .catch(() => {})
  );

  await Promise.allSettled(syncPromises);
}

/**
 * Fetches all synchronized projects from standalone Express backend or Firestore.
 */
export async function safeFetchProjects(): Promise<Project[] | null> {
  try {
    const response = await fetch('/api/projects/sync');
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data && Array.isArray(json.data)) {
        console.log('Successfully fetched projects from backend REST API');
        return json.data;
      }
    }
  } catch (err: any) {
    console.warn('Backend DB Fetch failed:', err?.message || err);
  }

  if (auth.currentUser) {
    try {
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projects: Project[] = [];
      querySnapshot.forEach(docSnap => {
        projects.push(docSnap.data() as Project);
      });
      if (projects.length > 0) {
        return projects;
      }
    } catch (fsErr) {
      handleFirestoreError(fsErr, OperationType.LIST, 'projects');
    }
  }

  return null;
}

/**
 * Synchronizes all registered users with backend REST API.
 */
export async function safeSyncUsers(users: AppUser[]): Promise<void> {
  try {
    const response = await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users)
    });
    if (response.ok) {
      console.log('Users successfully synchronized with backend REST API');
    }
  } catch (err: any) {
    console.warn('Backend users sync failed:', err?.message || err);
  }
}

/**
 * Fetches synchronized users list from backend REST API.
 */
export async function safeFetchUsers(): Promise<AppUser[] | null> {
  try {
    const response = await fetch('/api/users/sync');
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data && Array.isArray(json.data)) {
        console.log('Successfully fetched users from backend REST API');
        return json.data;
      }
    }
  } catch (err: any) {
    console.warn('Backend fetch users failed:', err?.message || err);
  }
  return null;
}

/**
 * Synchronizes all variance approvals with backend REST API.
 */
export async function safeSyncApprovals(approvals: ApprovalRequest[]): Promise<void> {
  try {
    const response = await fetch('/api/approvals/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvals)
    });
    if (response.ok) {
      console.log('Approvals successfully synchronized with backend REST API');
    }
  } catch (err: any) {
    console.warn('Backend approvals sync failed:', err?.message || err);
  }
}

/**
 * Fetches synchronized approvals list from backend REST API.
 */
export async function safeFetchApprovals(): Promise<ApprovalRequest[] | null> {
  try {
    const response = await fetch('/api/approvals/sync');
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data && Array.isArray(json.data)) {
        console.log('Successfully fetched approvals from backend REST API');
        return json.data;
      }
    }
  } catch (err: any) {
    console.warn('Backend fetch approvals failed:', err?.message || err);
  }
  return null;
}

/**
 * Synchronizes PMO and Directorate taxonomy with backend REST API.
 */
export async function safeSyncConfig(pmos: string[], directorates: string[]): Promise<void> {
  try {
    const response = await fetch('/api/config/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pmos, directorates })
    });
    if (response.ok) {
      console.log('Config successfully synchronized with backend REST API');
    }
  } catch (err: any) {
    console.warn('Backend config sync failed:', err?.message || err);
  }
}

/**
 * Fetches synchronized PMO and Directorate configuration from backend REST API.
 */
export async function safeFetchConfig(): Promise<{ pmos: string[], directorates: string[] } | null> {
  try {
    const response = await fetch('/api/config/sync');
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        console.log('Successfully fetched config from backend REST API');
        return json.data;
      }
    }
  } catch (err: any) {
    console.warn('Backend fetch config failed:', err?.message || err);
  }
  return null;
}

