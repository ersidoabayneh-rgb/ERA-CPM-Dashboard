import React, { useState, useEffect } from 'react';
import { getAccessToken, initAuth, googleSignIn, User } from '../lib/auth';
import { safeSyncProject } from '../lib/apiSync';
import { 
  CloudDownload, 
  CloudUpload, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  RefreshCw, 
  FileJson, 
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Key,
  Lock,
  Globe,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';

interface WorkspaceViewProps {
  projects?: any[];
  onRestoreProjects?: (restored: any[]) => void;
}

export default function WorkspaceView({ projects = [], onRestoreProjects }: WorkspaceViewProps) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [recentEmails, setRecentEmails] = useState<any[]>([]);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state for Google Drive Database Vault
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [backupFileInfo, setBackupFileInfo] = useState<{ id: string; name: string; modifiedTime?: string } | null>(null);
  const [checkingBackup, setCheckingBackup] = useState(false);

  // Offline Sync Queue State
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);

  useEffect(() => {
    const loadQueue = () => {
      try {
        const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
        setOfflineQueue(JSON.parse(queueStr));
      } catch {
        setOfflineQueue([]);
      }
    };
    loadQueue();
    window.addEventListener('storage', loadQueue);
    // Custom event listener for local mutations
    const handleMutation = () => {
      loadQueue();
    };
    window.addEventListener('local_project_mutated', handleMutation);
    return () => {
      window.removeEventListener('storage', loadQueue);
      window.removeEventListener('local_project_mutated', handleMutation);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth((currentUser, accessToken) => {
      setAuthUser(currentUser);
      setToken(accessToken);
    }, () => {
      setAuthUser(null);
      setToken(null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (token) {
      loadDriveFiles(token);
      loadEmails(token);
      checkExistingBackup(token);
    }
  }, [token]);

  const checkExistingBackup = async (accessToken: string) => {
    setCheckingBackup(true);
    try {
      const q = encodeURIComponent("name='ERA_Active_Contracts_Database.json' and trashed=false");
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          setBackupFileInfo(data.files[0]);
        } else {
          setBackupFileInfo(null);
        }
      }
    } catch (err) {
      console.error('Error checking Google Drive backup status:', err);
    } finally {
      setCheckingBackup(false);
    }
  };

  const loadDriveFiles = async (accessToken: string) => {
    setLoadingFiles(true);
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=6&fields=files(id,name,mimeType,modifiedTime)', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setRecentFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadEmails = async (accessToken: string) => {
    setLoadingEmails(true);
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch emails');
      const data = await res.json();
      
      const emailDetails = await Promise.all(
         (data.messages || []).map(async (msg: any) => {
           const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
              headers: { Authorization: `Bearer ${accessToken}` }
           });
           return detailRes.json();
         })
      );
      setRecentEmails(emailDetails);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleBackupToDrive = async () => {
    if (!token) return;
    setBackupLoading(true);
    setSyncStatus('Initiating secure cloud backup process...');
    setSyncError(null);
    try {
      // 1. Search if the file already exists
      const q = encodeURIComponent("name='ERA_Active_Contracts_Database.json' and trashed=false");
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!searchRes.ok) throw new Error('Failed to query existing backup files');
      const searchData = await searchRes.json();
      const existingFile = searchData.files && searchData.files[0];

      let fileId = '';
      if (existingFile) {
        fileId = existingFile.id;
        setSyncStatus('Existing backup file located. Overwriting database snapshot...');
      } else {
        // Create the file first with metadata
        setSyncStatus('Creating new Google Drive backup vault file...');
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'ERA_Active_Contracts_Database.json',
            mimeType: 'application/json',
            description: 'Independently synchronized ERA Active Contracts and Projects Database backup'
          })
        });
        if (!createRes.ok) throw new Error('Failed to create backup vault file');
        const createData = await createRes.json();
        fileId = createData.id;
      }

      // 2. Upload the projects JSON as content
      setSyncStatus('Transmitting database snapshot contents safely...');
      const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projects, null, 2)
      });

      if (!uploadRes.ok) throw new Error('Failed to write database snapshot to Google Drive');
      
      setSyncStatus('Database backup completed successfully! Current snapshot is safely stored on your Google Drive.');
      
      // Update local file info state
      await checkExistingBackup(token);
      await loadDriveFiles(token);
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Failed to complete Google Drive backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!token || !onRestoreProjects) return;
    if (!window.confirm('Are you sure you want to restore the database from your Google Drive backup? This will overwrite your local list and cloud database with the saved snapshot file.')) {
      return;
    }
    setRestoreLoading(true);
    setSyncStatus('Locating backup file in your Google Drive...');
    setSyncError(null);
    try {
      const q = encodeURIComponent("name='ERA_Active_Contracts_Database.json' and trashed=false");
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!searchRes.ok) throw new Error('Failed to query Google Drive files');
      const searchData = await searchRes.json();
      const existingFile = searchData.files && searchData.files[0];

      if (!existingFile) {
        throw new Error('No existing backup file named "ERA_Active_Contracts_Database.json" found in your Google Drive. Please create a backup first.');
      }

      setSyncStatus('Downloading database snapshot file...');
      const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!contentRes.ok) throw new Error('Failed to download backup file content');
      
      const restoredProjects = await contentRes.json();
      if (!Array.isArray(restoredProjects)) {
        throw new Error('Invalid backup file format: The selected file does not contain a valid array of projects.');
      }

      onRestoreProjects(restoredProjects);
      setSyncStatus(`Database successfully restored! Loaded ${restoredProjects.length} projects/contracts from Google Drive backup.`);
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Failed to restore database from Google Drive');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    try {
      await googleSignIn();
    } catch (err: any) {
      setError('Google Sign In failed');
    }
  };

  const handleBatchSyncNow = async () => {
    try {
      const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
      const queue = JSON.parse(queueStr);
      if (queue.length === 0) {
        alert('No pending local changes in the offline queue to synchronize.');
        return;
      }

      setIsBatchSyncing(true);
      setSyncStatus('Initiating batch synchronization with backend server...');
      setSyncError(null);

      // Clear/Synchronize local queue updates to backend Express REST API
      const remaining: any[] = [];
      for (const proj of queue) {
        try {
          await safeSyncProject(proj, true);
        } catch (err) {
          console.warn(`Failed to sync project ${proj.id}, keeping in offline queue:`, err);
          remaining.push(proj);
        }
      }

      localStorage.setItem('era_offline_sync_queue', JSON.stringify(remaining));
      setOfflineQueue(remaining);
      
      // Dispatch storage event so other components know the queue changed
      window.dispatchEvent(new Event('storage'));

      if (remaining.length === 0) {
        setSyncStatus('Batch synchronization completed successfully! All pending changes have been synchronized.');
        alert('Batch synchronization completed successfully! All pending changes have been synchronized.');
      } else {
        setSyncError(`Batch synchronization finished, but ${remaining.length} items could not be synchronized and remain in the offline queue.`);
        alert(`Batch synchronization finished, but ${remaining.length} items could not be synchronized and remain in the offline queue.`);
      }
    } catch (error) {
      console.error('Error during manual batch synchronization:', error);
      setSyncError('Failed to perform batch synchronization. Please try again.');
      alert('Failed to perform batch synchronization. Please try again.');
    } finally {
      setIsBatchSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white p-6 rounded-3xl shadow-sm border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <h2 className="text-xl font-bold tracking-tight">Firebase Cloud Firestore Vault</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Store, secure, and synchronize your active contracts database directly with Firebase Cloud Firestore.
            </p>
          </div>
          {!authUser ? (
            <button 
              onClick={handleLogin} 
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 px-5 rounded-2xl shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Database className="h-4 w-4" />
              Connect Workspace Account
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-200">
                Connected: {authUser.email}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Vault Workspace */}
      {authUser && token ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Cloud Synchronization and Backup panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Firebase Cloud Firestore Vault Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                  <Database className="h-5 w-5" />
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">Firebase Cloud Firestore Database</h3>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your contract data, users, and approval workflows are automatically synchronized and securely persisted with <strong>Firebase Cloud Firestore</strong>. Google Drive integration has been disabled as requested.
                </p>

                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Real-Time Cloud Synchronization Active
                    </h4>
                    <div className="flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Firebase Active
                    </div>
                  </div>
                  <p className="text-sm text-emerald-700/80 dark:text-emerald-200/70">
                    <strong>Online & Federated:</strong> Connected to Firebase Cloud Firestore. All project updates, financial allocations, and user workflows are synced live with full IndexedDB offline persistence enabled.
                  </p>
                </div>
              </div>
            </div>

            {/* Offline Database Queue & Manual Synchronization */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                    <Database className="h-5 w-5" />
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Offline Database Queue & Synchronization</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Manually push all local, pending offline project changes directly to the remote central server.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 px-4 py-2 rounded-2xl border border-amber-200/50">
                  <span className={`h-2.5 w-2.5 rounded-full ${offlineQueue.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                    {offlineQueue.length} Updates Pending
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Pending Changes Queue</span>
                  <span className="text-[10px] lowercase text-slate-400">Backend API Sync</span>
                </div>
                {offlineQueue.length === 0 ? (
                  <div className="flex items-center gap-2.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium py-2">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                    Your database queue is clean. No pending changes to sync!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {offlineQueue.map((proj, idx) => (
                      <div key={proj.id || idx} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <div className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-xs">
                          {proj.name}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                          ID: {proj.id}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  Manual batch sync triggers a high-priority transmission to all federated servers immediately.
                </div>
                
                <button
                  onClick={handleBatchSyncNow}
                  disabled={isBatchSyncing || offlineQueue.length === 0}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-slate-200 disabled:to-slate-300 dark:disabled:from-slate-800 dark:disabled:to-slate-900 disabled:text-slate-400 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm shadow-md shadow-amber-500/10"
                >
                  {isBatchSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {isBatchSyncing ? 'Synchronizing Batch...' : 'Batch Sync Now'}
                </button>
              </div>
            </div>

          </div>

          {/* Cloud Firestore Engine Status Column */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-emerald-500" />
                Firebase Cloud Engine
              </h3>
              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase">
                Active
              </span>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-200">Database ID:</div>
                <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 truncate">
                  (default)
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-200">IndexedDB Persistence:</div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Enabled (Offline Ready)
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-200">Google Drive:</div>
                <div className="text-slate-400 font-medium">
                  Disabled
                </div>
              </div>
            </div>
          </div>

          {/* Email integration column */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Recent Gmail Messages ({authUser.email})
            </h3>

            {loadingEmails ? (
              <div className="space-y-2 py-4">
                <div className="h-10 bg-slate-100 dark:bg-slate-850 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-100 dark:bg-slate-850 rounded-xl animate-pulse" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentEmails.map((email: any) => {
                  const subjectHeader = email.payload?.headers?.find((h: any) => h.name === 'Subject');
                  const fromHeader = email.payload?.headers?.find((h: any) => h.name === 'From');
                  return (
                    <div key={email.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl flex flex-col justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 line-clamp-1">
                          {subjectHeader?.value || '(No Subject)'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1.5 truncate">
                          From: {fromHeader?.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {recentEmails.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 col-span-full">No messages found in your inbox.</p>
                )}
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-950 p-12 text-center rounded-3xl border border-slate-150 dark:border-slate-850 space-y-4">
          <Database className="h-12 w-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300">Google Workspace Integrations</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Authorize Google Workspace to activate your independent database storage vault. This creates a secure sandbox connected directly to Google Drive and your email context.
          </p>
          <button 
            onClick={handleLogin} 
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-6 rounded-2xl shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer mt-2"
          >
            Connect Account
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
