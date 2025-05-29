import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, getCurrentUser } from '@/services/authService';

/**
 * Auth context type definition
 * Contains current user information and loading state
 */
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
});

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component
 * Manages authentication state and provides it to the app
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Auth provider initializing');
    
    // Check if there's already a user logged in
    const user = getCurrentUser();
    if (user) {
      console.log('User already logged in:', user.uid);
      setCurrentUser(user);
    }

    // Set up auth state listener
    const unsubscribe = onAuthStateChange((user) => {
      console.log('Auth state changed, user:', user?.uid);
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Auth context value object
  const value = {
    currentUser,
    loading,
  };

  console.log('Auth provider rendering, loading:', loading, 'user:', currentUser?.uid);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
