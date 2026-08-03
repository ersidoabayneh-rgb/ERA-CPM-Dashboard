export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`localStorage.setItem failed for key "${key}":`, error);
    if (error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      console.warn('LocalStorage quota exceeded. Attempting to clear older or unused storage keys...');
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) {
            // Remove older versions of projects/users/approvals keys (e.g. up to v27)
            const matchProj = k.match(/^era_proj_v(\d+)$/);
            if (matchProj && parseInt(matchProj[1], 10) < 28) {
              keysToRemove.push(k);
            }
            const matchUsers = k.match(/^era_users_v(\d+)$/);
            if (matchUsers && parseInt(matchUsers[1], 10) < 28) {
              keysToRemove.push(k);
            }
            const matchAppr = k.match(/^era_appr_v(\d+)$/);
            if (matchAppr && parseInt(matchAppr[1], 10) < 28) {
              keysToRemove.push(k);
            }
          }
        }
        if (keysToRemove.length > 0) {
          console.info('Removing obsolete keys:', keysToRemove);
          keysToRemove.forEach(k => localStorage.removeItem(k));
          try {
            localStorage.setItem(key, value);
            return;
          } catch (retryError) {
            console.error('Failed to setItem even after clearing obsolete keys:', retryError);
          }
        }
      } catch (cleanError) {
        console.error('Error during localStorage cleanup:', cleanError);
      }
    }
  }
}
