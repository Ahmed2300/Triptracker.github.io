import { database, auth } from '@/lib/firebase';
import { ref, push, set, onValue, off, serverTimestamp, query, orderByChild, equalTo, remove, get } from 'firebase/database';
import { RideRequest } from './firebaseService';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'ride_update' | 'driver_update' | 'payment' | 'system' | 'promo';
  rideId?: string;
  actionUrl?: string;
  icon?: string;
  priority: 'low' | 'medium' | 'high';
  expiresAt?: number;
}

/**
 * Creates a new notification for a user
 */
export const createNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
  const notificationsRef = ref(database, 'notifications');
  const newNotificationRef = push(notificationsRef);
  
  const notification: Omit<Notification, 'id'> = {
    ...notificationData,
    timestamp: Date.now(),
    read: false,
  };
  
  await set(newNotificationRef, notification);
  return { id: newNotificationRef.key, ...notification };
};

/**
 * Creates a ride update notification for a customer
 */
export const createRideUpdateNotificationForCustomer = async (
  ride: RideRequest, 
  title: string, 
  message: string,
  priority: 'low' | 'medium' | 'high' = 'medium'
) => {
  if (!ride.customerId || !ride.id) return null;
  
  return createNotification({
    userId: ride.customerId,
    title,
    message,
    type: 'ride_update',
    rideId: ride.id,
    priority,
    icon: getIconForRideStatus(ride.status)
  });
};

/**
 * Creates a ride update notification for a driver
 */
export const createRideUpdateNotificationForDriver = async (
  ride: RideRequest, 
  title: string, 
  message: string,
  priority: 'low' | 'medium' | 'high' = 'medium'
) => {
  if (!ride.driverId || !ride.id) return null;
  
  return createNotification({
    userId: ride.driverId,
    title,
    message,
    type: 'ride_update',
    rideId: ride.id,
    priority,
    icon: getIconForRideStatus(ride.status)
  });
};

/**
 * Listen to a user's notifications
 */
export const listenToUserNotifications = (callback: (notifications: Notification[]) => void) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('User must be signed in to listen to notifications');
    callback([]);
    return () => {};
  }
  
  const notificationsRef = query(
    ref(database, 'notifications'), 
    orderByChild('userId'), 
    equalTo(currentUser.uid)
  );
  
  const handleNotifications = (snapshot: any) => {
    const notificationsData = snapshot.val();
    const notificationsList: Notification[] = [];
    
    if (notificationsData) {
      Object.keys(notificationsData).forEach(key => {
        notificationsList.push({
          id: key,
          ...notificationsData[key]
        });
      });
    }
    
    // Sort notifications by timestamp (newest first)
    notificationsList.sort((a, b) => b.timestamp - a.timestamp);
    
    callback(notificationsList);
  };
  
  onValue(notificationsRef, handleNotifications);
  
  // Return the unsubscribe function
  return () => off(notificationsRef, 'value', handleNotifications);
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  const notificationRef = ref(database, `notifications/${notificationId}`);
  await set(notificationRef, { read: true }, { merge: true });
  return true;
};

/**
 * Mark all user notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('User must be signed in to mark notifications as read');
    return false;
  }
  
  const notificationsRef = query(
    ref(database, 'notifications'), 
    orderByChild('userId'), 
    equalTo(currentUser.uid)
  );
  
  const snapshot = await get(notificationsRef);
  const notificationsData = snapshot.val();
  
  if (notificationsData) {
    const updates: Record<string, any> = {};
    
    Object.keys(notificationsData).forEach(key => {
      updates[`notifications/${key}/read`] = true;
    });
    
    if (Object.keys(updates).length > 0) {
      const rootRef = ref(database);
      await set(rootRef, updates, { merge: true });
    }
  }
  
  return true;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string) => {
  const notificationRef = ref(database, `notifications/${notificationId}`);
  await remove(notificationRef);
  return true;
};

/**
 * Get appropriate icon for ride status
 */
const getIconForRideStatus = (status: RideRequest['status']): string => {
  switch (status) {
    case 'pending': return 'clock';
    case 'accepted': return 'check-circle';
    case 'started': return 'car';
    case 'completed': return 'flag';
    case 'cancelled': return 'x-circle';
    default: return 'bell';
  }
};

/**
 * Create system-wide notification for all users (admin only)
 */
export const createSystemNotification = async (
  title: string,
  message: string,
  userIds: string[],
  priority: 'low' | 'medium' | 'high' = 'medium',
  expiresAt?: number
) => {
  // In a real app, this would check admin permissions
  const notificationPromises = userIds.map(userId => 
    createNotification({
      userId,
      title,
      message,
      type: 'system',
      priority,
      icon: 'info',
      expiresAt
    })
  );
  
  await Promise.all(notificationPromises);
  return true;
};
