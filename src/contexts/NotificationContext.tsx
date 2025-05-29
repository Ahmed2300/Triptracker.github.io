import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Notification, listenToUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '@/services/notificationService';
import { useToast } from '@/components/ui/use-toast';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  removeNotification: (notificationId: string) => Promise<boolean>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // Calculate unread count
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    // Subscribe to user's notifications
    const unsubscribe = listenToUserNotifications((notificationsList) => {
      setNotifications(notificationsList);
      setIsLoading(false);
    });
    
    return () => {
      unsubscribe();
    };
  }, [currentUser]);
  
  // Show toast for new high-priority notifications
  useEffect(() => {
    // Check for new high-priority unread notifications
    const highPriorityUnread = notifications.filter(
      n => n.priority === 'high' && !n.read && n.timestamp > Date.now() - 30000 // Within last 30 seconds
    );
    
    // Show toast for each high-priority notification
    highPriorityUnread.forEach(notification => {
      toast({
        title: notification.title,
        description: notification.message,
        variant: "default",
        duration: 5000,
      });
      
      // Auto-mark as read after showing toast
      markAsRead(notification.id as string).catch(console.error);
    });
  }, [notifications, toast]);
  
  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };
  
  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  };
  
  const removeNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      
      return true;
    } catch (error) {
      console.error('Error removing notification:', error);
      return false;
    }
  };
  
  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    isLoading
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
