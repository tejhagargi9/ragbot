import { auth } from './firebase';
import { User } from 'firebase/auth';

export async function createSessionCookie(user: User): Promise<void> {
  try {
    // Get the ID token
    const idToken = await user.getIdToken();

    // Set cookie with 2-hour expiry
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + (2 * 60 * 60 * 1000)); // 2 hours

    document.cookie = `session=${idToken}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=strict`;
  } catch (error) {
    console.error('Error creating session cookie:', error);
    throw error;
  }
}

export function clearSessionCookie(): void {
  document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export function getSessionToken(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'session') {
      return value;
    }
  }
  return null;
}

export async function logout(): Promise<void> {
  try {
    // Clear session cookie
    clearSessionCookie();

    // Sign out from Firebase
    await auth.signOut();
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
}