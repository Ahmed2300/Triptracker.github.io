import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    return { 
      success: false, 
      error: error.message || 'An error occurred during sign in' 
    };
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Error signing out:', error);
    return { 
      success: false, 
      error: error.message || 'An error occurred during sign out' 
    };
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Check if user is signed in
export const isUserSignedIn = (): boolean => {
  return !!auth.currentUser;
};
