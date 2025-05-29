import { getDatabase, ref, set, get, update } from 'firebase/database';
import { auth } from '@/lib/firebase';

/**
 * User profile interface
 */
export interface UserProfile {
  phoneNumber: string;
  userType?: 'customer' | 'driver';
  displayName?: string;
  email?: string;
  photoURL?: string;
}

/**
 * Save or update a user's phone number
 * @param phoneNumber - The validated phone number
 * @returns Promise resolving to success or error
 */
export const saveUserPhoneNumber = async (phoneNumber: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      return { 
        success: false, 
        error: 'No authenticated user found' 
      };
    }
    
    const db = getDatabase();
    const userProfileRef = ref(db, `userProfiles/${userId}`);
    
    // Get existing profile data first
    const snapshot = await get(userProfileRef);
    const existingData = snapshot.exists() ? snapshot.val() : {};
    
    // Update with new phone number while preserving other data
    await update(userProfileRef, { 
      ...existingData,
      phoneNumber,
      displayName: auth.currentUser?.displayName || existingData.displayName,
      email: auth.currentUser?.email || existingData.email,
      photoURL: auth.currentUser?.photoURL || existingData.photoURL,
      lastUpdated: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error saving phone number:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to save phone number' 
    };
  }
};

/**
 * Check if a user has a phone number registered
 * @returns Promise resolving to boolean indicating if phone number exists
 */
export const hasPhoneNumber = async (): Promise<boolean> => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      return false;
    }
    
    const db = getDatabase();
    const userProfileRef = ref(db, `userProfiles/${userId}`);
    const snapshot = await get(userProfileRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return !!data.phoneNumber;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking phone number:', error);
    return false;
  }
};

/**
 * Get a user's phone number by their user ID
 * @param userId - The Firebase user ID
 * @returns Promise resolving to phone number or null
 */
export const getUserPhoneNumber = async (userId: string): Promise<string | null> => {
  try {
    const db = getDatabase();
    const userProfileRef = ref(db, `userProfiles/${userId}`);
    const snapshot = await get(userProfileRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return data.phoneNumber || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting phone number:', error);
    return null;
  }
};

/**
 * Get current user's profile
 * @returns Promise resolving to user profile or null
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      return null;
    }
    
    const db = getDatabase();
    const userProfileRef = ref(db, `userProfiles/${userId}`);
    const snapshot = await get(userProfileRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Update user type (customer or driver)
 * @param userType - The user type
 * @returns Promise resolving to success or error
 */
export const saveUserType = async (userType: 'customer' | 'driver'): Promise<{ success: boolean; error?: string }> => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      return { 
        success: false, 
        error: 'No authenticated user found' 
      };
    }
    
    const db = getDatabase();
    const userProfileRef = ref(db, `userProfiles/${userId}`);
    
    // Get existing profile data first
    const snapshot = await get(userProfileRef);
    const existingData = snapshot.exists() ? snapshot.val() : {};
    
    // Update with user type while preserving other data
    await update(userProfileRef, { 
      ...existingData,
      userType,
      lastUpdated: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error saving user type:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to save user type' 
    };
  }
};
