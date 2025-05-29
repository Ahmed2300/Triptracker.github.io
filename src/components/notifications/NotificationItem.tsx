import { useNotifications } from '@/contexts/NotificationContext';
import { Notification } from '@/services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { SheetClose } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Car, 
  CheckCircle, 
  Clock, 
  Flag, 
  Info, 
  MapPin, 
  Tag, 
  X,
  XCircle 
} from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  onOpenChange?: () => void;
}

const NotificationItem = ({ notification, onOpenChange }: NotificationItemProps) => {
  const { markAsRead, removeNotification } = useNotifications();
  const navigate = useNavigate();
  
  const handleClick = async () => {
    // Mark as read when clicked
    if (!notification.read && notification.id) {
      await markAsRead(notification.id);
    }
    
    // Navigate if there's an action URL or ride ID
    if (notification.actionUrl) {
      onOpenChange?.();
      navigate(notification.actionUrl);
    } else if (notification.rideId) {
      onOpenChange?.();
      // In a real app, we'd navigate to the ride details page
      // navigate(`/rides/${notification.rideId}`);
    }
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.id) {
      await removeNotification(notification.id);
    }
  };
  
  const getIcon = () => {
    // Return icon based on notification type and icon property
    switch (notification.icon) {
      case 'clock':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'check-circle':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'car':
        return <Car className="h-5 w-5 text-indigo-500" />;
      case 'flag':
        return <Flag className="h-5 w-5 text-green-600" />;
      case 'x-circle':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        // Default icons based on notification type
        if (notification.type === 'ride_update') {
          return <Car className="h-5 w-5 text-indigo-500" />;
        } else if (notification.type === 'payment') {
          return <Tag className="h-5 w-5 text-green-500" />;
        } else if (notification.type === 'driver_update') {
          return <MapPin className="h-5 w-5 text-blue-500" />;
        } else {
          return <Bell className="h-5 w-5 text-gray-500" />;
        }
    }
  };
  
  const getPriorityStyles = () => {
    // Return styles based on notification priority and read status
    if (!notification.read) {
      if (notification.priority === 'high') {
        return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500';
      } else if (notification.priority === 'medium') {
        return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500';
      } else {
        return 'bg-gray-50 hover:bg-gray-100 border-l-4 border-gray-300';
      }
    } else {
      return 'hover:bg-gray-50 border-l-4 border-transparent';
    }
  };
  
  return (
    <div 
      className={`px-4 py-3 border-b cursor-pointer transition-colors ${getPriorityStyles()}`}
      onClick={handleClick}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-start justify-between">
            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
              {notification.title}
            </p>
            <p className="text-xs text-gray-500 ml-2">
              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
            </p>
          </div>
          <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
            {notification.message}
          </p>
          <div className="flex justify-end mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-red-600 p-0 h-6 w-6"
              onClick={handleDelete}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
