import { auth as firebaseAuth, googleProvider } from './firebase.ts';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

let currentUser: User | null = null;
const authListeners: Array<(user: User | null) => void> = [];

export const auth = {
  get currentUser() {
    return currentUser;
  }
};

export function initAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      currentUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        getIdToken: (forceRefresh?: boolean) => fbUser.getIdToken(forceRefresh),
      };
      const token = await fbUser.getIdToken();
      onAuthSuccess?.(currentUser, token);
    } else {
      currentUser = null;
      onAuthFailure?.();
    }
    authListeners.forEach(listener => listener(currentUser));
  });

  return unsubscribe;
}

export async function googleSignIn(): Promise<User | null> {
  try {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const fbUser = result.user;
    currentUser = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
      getIdToken: (forceRefresh?: boolean) => fbUser.getIdToken(forceRefresh),
    };
    authListeners.forEach(listener => listener(currentUser));
    return currentUser;
  } catch (error) {
    console.error("Firebase Google Sign-In error:", error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(firebaseAuth);
  currentUser = null;
  authListeners.forEach(listener => listener(currentUser));
}

export async function getAccessToken(): Promise<string | null> {
  return currentUser ? currentUser.getIdToken() : null;
}

