import { Project, User as AppUser, ApprovalRequest } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

let syncSuspendedState = false;

export function isSyncSuspended(): boolean {
  return syncSuspendedState;
}

export async function reactivateSync(): Promise<void> {
  syncSuspendedState = false;
}

/**
 * Robust, self-healing project sync function that handles Relational REST Backend Sync.
 */
export async function safeSyncProject(proj: Project, isBackgroundQueueSync = false): Promise<void> {
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
 * Deletes a project from standalone Express backend.
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
 * Fetches all synchronized projects from standalone Express backend.
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
