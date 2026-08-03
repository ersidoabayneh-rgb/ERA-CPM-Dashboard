export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

let currentUser: User | null = {
  uid: 'admin_user',
  email: 'admin@era.gov.et',
  displayName: 'ERA Administrator',
  getIdToken: async () => 'standalone_token_era_admin',
};

const authListeners: Array<(user: User | null) => void> = [];

export const auth = {
  get currentUser() {
    return currentUser;
  }
};

export function initAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  _onAuthFailure?: () => void
): () => void {
  if (currentUser) {
    onAuthSuccess?.(currentUser, 'standalone_token_era_admin');
  }
  authListeners.forEach(listener => listener(currentUser));

  return () => {};
}

export async function googleSignIn(): Promise<User | null> {
  currentUser = {
    uid: 'admin_user',
    email: 'admin@era.gov.et',
    displayName: 'ERA Administrator',
    getIdToken: async () => 'standalone_token_era_admin',
  };
  authListeners.forEach(listener => listener(currentUser));
  return currentUser;
}

export async function signOutUser(): Promise<void> {
  currentUser = null;
  authListeners.forEach(listener => listener(currentUser));
}

export async function getAccessToken(): Promise<string | null> {
  return currentUser ? currentUser.getIdToken() : null;
}
