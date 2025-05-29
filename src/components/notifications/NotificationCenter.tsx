import { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationItem from '@/components/notifications/NotificationItem';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Notification } from '@/services/notificationService';

interface NotificationCenterProps {
  variant?: 'default' | 'outline' | 'ghost';
  showText?: boolean;
}

const NotificationCenter = ({ 
  variant = 'outline', 
  showText = false 
}: NotificationCenterProps) => {
  const { notifications, unreadCount, markAllAsRead, isLoading } = useNotifications();
  const [open, setOpen] = useState(false);
  
  // Group notifications by read status
  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);
  
  // Group by type for tab view
  const rideNotifications = notifications.filter(n => n.type === 'ride_update');
  const systemNotifications = notifications.filter(n => 
    n.type === 'system' || n.type === 'promo'
  );
  
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={variant} className="relative">
          <Bell className="h-5 w-5" />
          {showText && <span className="ml-2">Notifications</span>}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 px-1.5 min-w-5 h-5 flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 overflow-hidden">
        <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-indigo-600 to-blue-500">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </SheetTitle>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-white hover:text-white hover:bg-white/20"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-3 w-full rounded-none border-b">
            <TabsTrigger value="all">
              All
              {notifications.length > 0 && (
                <Badge variant="outline" className="ml-1 bg-blue-100 text-blue-800 border-blue-300">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rides">
              Rides
              {rideNotifications.length > 0 && (
                <Badge variant="outline" className="ml-1 bg-green-100 text-green-800 border-green-300">
                  {rideNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="system">
              System
              {systemNotifications.length > 0 && (
                <Badge variant="outline" className="ml-1 bg-orange-100 text-orange-800 border-orange-300">
                  {systemNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[70vh]">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
                  <Bell className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-gray-500">No notifications yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    We'll notify you of important updates here
                  </p>
                </div>
              ) : (
                <>
                  {unreadNotifications.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-1 bg-gray-50 text-sm font-medium text-gray-500">
                        New
                      </div>
                      <div>
                        {unreadNotifications.map((notification) => (
                          <NotificationItem 
                            key={notification.id} 
                            notification={notification} 
                            onOpenChange={() => setOpen(false)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {readNotifications.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-1 bg-gray-50 text-sm font-medium text-gray-500">
                        Earlier
                      </div>
                      <div>
                        {readNotifications.map((notification) => (
                          <NotificationItem 
                            key={notification.id} 
                            notification={notification}
                            onOpenChange={() => setOpen(false)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="rides" className="m-0">
            <ScrollArea className="h-[70vh]">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
              ) : rideNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
                  <Bell className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-gray-500">No ride notifications</p>
                </div>
              ) : (
                <div>
                  {rideNotifications.map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification}
                      onOpenChange={() => setOpen(false)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="system" className="m-0">
            <ScrollArea className="h-[70vh]">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
              ) : systemNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
                  <Bell className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-gray-500">No system notifications</p>
                </div>
              ) : (
                <div>
                  {systemNotifications.map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification}
                      onOpenChange={() => setOpen(false)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;
