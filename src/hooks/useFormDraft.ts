import { useState, useEffect, useCallback, useRef } from 'react';
import { auth, User, initAuth } from '../lib/auth';

export interface DraftPayload<T> {
  data: T;
  updatedAt: string; // ISO 8601 string
}

export interface UseFormDraftOptions<T> {
  formId: string;
  initialValues: T;
  onRestore?: (data: T) => void;
  debounceMs?: number;
  serverDebounceMs?: number;
}

export function useFormDraft<T>({
  formId,
  initialValues,
  onRestore,
  debounceMs = 500,
  serverDebounceMs = 2000,
}: UseFormDraftOptions<T>) {
  const [formData, setFormData] = useState<T>(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  
  // Conflict resolution state
  const [conflict, setConflict] = useState<{
    localData: T;
    serverData: T;
    localTime: string;
    serverTime: string;
  } | null>(null);

  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);

  // Keep latest values in refs to avoid re-triggering effects
  const formDataRef = useRef<T>(formData);
  const authUserRef = useRef<User | null>(authUser);
  const localTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  // Storage key generator
  const getLocalKey = useCallback(() => {
    const uid = authUser?.uid || 'anonymous';
    return `draft:${uid}:${formId}`;
  }, [formId, authUser]);

  // Clean draft from local and server
  const clearDraft = useCallback(async () => {
    // 1. Clear local
    try {
      localStorage.removeItem(getLocalKey());
      // Also clear any fallback keys
      localStorage.removeItem(`draft:anonymous:${formId}`);
      if (authUser?.uid) {
        localStorage.removeItem(`draft:${authUser.uid}:${formId}`);
      }
    } catch (e) {
      console.warn('Failed to clear local draft:', e);
    }

    setHasDraft(false);
    setConflict(null);

    // 2. Clear server if authenticated
    if (authUser) {
      try {
        const token = await authUser.getIdToken();
        const res = await fetch(`/api/drafts/${formId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        if (!res.ok) {
          console.warn('Server failed to delete draft');
        }
      } catch (e) {
        console.warn('Failed to delete server draft:', e);
      }
    }
  }, [formId, authUser, getLocalKey]);

  // Get server draft
  const fetchServerDraft = useCallback(async (user: User): Promise<DraftPayload<T> | null> => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/drafts/${formId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.draft) {
          return {
            data: json.draft.data,
            updatedAt: json.draft.updatedAt,
          };
        }
      }
    } catch (err) {
      console.warn('Failed to fetch draft from server:', err);
    }
    return null;
  }, [formId]);

  // Save to server API
  const saveToServer = useCallback(async (data: T, updatedAt: string) => {
    const user = authUserRef.current;
    if (!user) return;

    try {
      setIsSaving(true);
      const token = await user.getIdToken();
      const res = await fetch(`/api/drafts/${formId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data,
          updatedAt,
        })
      });

      if (res.ok) {
        setLastSaved(new Date().toLocaleTimeString());
      } else {
        console.warn('Server draft save returned non-ok status');
      }
    } catch (err) {
      console.warn('Server draft save failed (offline or network error):', err);
    } finally {
      setIsSaving(false);
    }
  }, [formId]);

  // Save to local storage
  const saveToLocal = useCallback((data: T, updatedAt: string) => {
    try {
      const payload: DraftPayload<T> = { data, updatedAt };
      localStorage.setItem(getLocalKey(), JSON.stringify(payload));
      setHasDraft(true);
      setLastSaved(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to write local draft:', e);
    }
  }, [getLocalKey]);

  // Master auto-saver (combines local immediate and server debounced)
  const handleFormChange = useCallback((newData: T | ((prev: T) => T)) => {
    const nextVal = typeof newData === 'function' ? (newData as Function)(formDataRef.current) : newData;
    setFormData(nextVal);

    const nowIso = new Date().toISOString();

    // 1. Debounce Local Storage write
    if (localTimeoutRef.current) clearTimeout(localTimeoutRef.current);
    localTimeoutRef.current = setTimeout(() => {
      saveToLocal(nextVal, nowIso);
    }, debounceMs);

    // 2. Debounce Server Storage upload (if authenticated)
    if (serverTimeoutRef.current) clearTimeout(serverTimeoutRef.current);
    if (authUserRef.current) {
      serverTimeoutRef.current = setTimeout(() => {
        saveToServer(nextVal, nowIso);
      }, serverDebounceMs);
    }
  }, [debounceMs, serverDebounceMs, saveToLocal, saveToServer]);

  // Load and Restore Draft logic (comparing timestamps for conflict resolution)
  const loadAndRestoreDraft = useCallback(async (user: User | null) => {
    try {
      const localKey = user ? `draft:${user.uid}:${formId}` : `draft:anonymous:${formId}`;
      const localStr = localStorage.getItem(localKey);
      let localDraft: DraftPayload<T> | null = null;

      if (localStr) {
        try {
          localDraft = JSON.parse(localStr);
        } catch {
          localDraft = null;
        }
      }

      // Check for anonymous draft to migrate if just logged in
      if (user && !localDraft) {
        const anonStr = localStorage.getItem(`draft:anonymous:${formId}`);
        if (anonStr) {
          try {
            localDraft = JSON.parse(anonStr);
            // Migrate to authenticated local key
            localStorage.setItem(localKey, anonStr);
            localStorage.removeItem(`draft:anonymous:${formId}`);
          } catch {
            // ignore
          }
        }
      }

      if (user) {
        // Authenticated: Fetch server draft
        const serverDraft = await fetchServerDraft(user);

        if (localDraft && serverDraft) {
          const localTime = new Date(localDraft.updatedAt).getTime();
          const serverTime = new Date(serverDraft.updatedAt).getTime();

          const isLocalNewer = localTime >= serverTime;
          const newer = isLocalNewer ? localDraft : serverDraft;

          setFormData(newer.data);
          setHasDraft(true);
          if (onRestore) onRestore(newer.data);

          // If there is a significant timestamp gap and they are structurally different, align them automatically
          if (Math.abs(localTime - serverTime) > 2000) {
            const localDataStr = JSON.stringify(localDraft.data);
            const serverDataStr = JSON.stringify(serverDraft.data);

            if (localDataStr !== serverDataStr) {
              console.log(`Form draft conflict resolved automatically considering the latest date: ${newer.updatedAt}`);
              if (isLocalNewer) {
                saveToServer(localDraft.data, localDraft.updatedAt);
              } else {
                saveToLocal(serverDraft.data, serverDraft.updatedAt);
              }
            }
          }
        } else if (serverDraft) {
          // Restore server-only draft
          setFormData(serverDraft.data);
          saveToLocal(serverDraft.data, serverDraft.updatedAt);
          setHasDraft(true);
          if (onRestore) onRestore(serverDraft.data);
        } else if (localDraft) {
          // Restore local-only draft and sync it to server
          setFormData(localDraft.data);
          setHasDraft(true);
          saveToServer(localDraft.data, localDraft.updatedAt);
          if (onRestore) onRestore(localDraft.data);
        }
      } else {
        // Unauthenticated: Restore local draft
        if (localDraft) {
          setFormData(localDraft.data);
          setHasDraft(true);
          if (onRestore) onRestore(localDraft.data);
        }
      }
    } catch (e) {
      console.error('Failed to load form draft:', e);
    }
  }, [formId, onRestore, fetchServerDraft, saveToLocal, saveToServer]);

  // Conflict resolver
  const resolveConflict = useCallback((choice: 'local' | 'server') => {
    if (!conflict) return;

    const chosenData = choice === 'local' ? conflict.localData : conflict.serverData;
    const chosenTime = choice === 'local' ? conflict.localTime : conflict.serverTime;
    const nowIso = new Date(chosenTime).toISOString();

    setFormData(chosenData);
    setConflict(null);

    // Save chosen one everywhere
    saveToLocal(chosenData, nowIso);
    if (authUser) {
      saveToServer(chosenData, nowIso);
    }

    if (onRestore) {
      onRestore(chosenData);
    }
  }, [conflict, authUser, saveToLocal, saveToServer, onRestore]);

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = initAuth((user) => {
      setAuthUser(user);
      loadAndRestoreDraft(user);
    });

    return () => {
      unsubscribe();
      if (localTimeoutRef.current) clearTimeout(localTimeoutRef.current);
      if (serverTimeoutRef.current) clearTimeout(serverTimeoutRef.current);
    };
  }, [loadAndRestoreDraft]);

  return {
    formData,
    setFormData: handleFormChange,
    isSaving,
    lastSaved,
    hasDraft,
    conflict,
    resolveConflict,
    clearDraft,
    reloadDraft: () => loadAndRestoreDraft(authUser),
  };
}
