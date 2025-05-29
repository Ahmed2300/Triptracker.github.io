import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AlertCircle, Wifi, WifiOff, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface ConnectivityContextType {
  isOnline: boolean;
  hasLocationPermission: boolean;
  locationAvailable: boolean;
  checkLocationPermission: () => Promise<boolean>;
  requestLocationPermission: () => Promise<boolean>;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

interface ConnectivityProviderProps {
  children: ReactNode;
}

export const ConnectivityProvider: React.FC<ConnectivityProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [locationAvailable, setLocationAvailable] = useState<boolean>(false);
  const [showNetworkAlert, setShowNetworkAlert] = useState<boolean>(false);
  const [showLocationAlert, setShowLocationAlert] = useState<boolean>(false);
  
  // Check if we're running on Android (PWA or WebView)
  const isAndroid = (): boolean => {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.indexOf('android') > -1;
  };

  // Network connectivity monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNetworkAlert(false);
      toast({
        title: "Connection Restored",
        description: "You're back online.",
        variant: "default",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNetworkAlert(true);
      toast({
        title: "No Internet Connection",
        description: "Please check your network settings.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) {
      setShowNetworkAlert(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Location permission checking
  const checkLocationPermission = async (): Promise<boolean> => {
    try {
      // First, check if geolocation is available in the browser
      if (!('geolocation' in navigator)) {
        setLocationAvailable(false);
        setHasLocationPermission(false);
        setShowLocationAlert(true);
        return false;
      }
      
      setLocationAvailable(true);
      
      // For Android, we need to use the Permissions API if available
      if (isAndroid() && 'permissions' in navigator) {
        const permission = await (navigator as any).permissions.query({ name: 'geolocation' });
        
        const permissionGranted = permission.state === 'granted';
        setHasLocationPermission(permissionGranted);
        
        if (!permissionGranted && permission.state === 'denied') {
          setShowLocationAlert(true);
        } else {
          setShowLocationAlert(false);
        }
        
        return permissionGranted;
      } 
      
      // For browsers without Permissions API, try to get position
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setHasLocationPermission(true);
            setShowLocationAlert(false);
            resolve(true);
          },
          () => {
            setHasLocationPermission(false);
            setShowLocationAlert(true);
            resolve(false);
          },
          { timeout: 5000, maximumAge: 0 }
        );
      });
    } catch (error) {
      console.error('Error checking location permission:', error);
      setHasLocationPermission(false);
      setShowLocationAlert(true);
      return false;
    }
  };

  // Request location permissions
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      if (!('geolocation' in navigator)) {
        return false;
      }
      
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setHasLocationPermission(true);
            setShowLocationAlert(false);
            resolve(true);
          },
          () => {
            setHasLocationPermission(false);
            setShowLocationAlert(true);
            resolve(false);
          },
          { 
            timeout: 10000, 
            maximumAge: 0,
            enableHighAccuracy: true // Better for mobile devices
          }
        );
      });
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
    
    // Set up periodic checks for location permission (every 30 seconds)
    const interval = setInterval(() => {
      checkLocationPermission();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <ConnectivityContext.Provider 
      value={{ 
        isOnline, 
        hasLocationPermission, 
        locationAvailable,
        checkLocationPermission,
        requestLocationPermission
      }}
    >
      {/* Network connectivity alert */}
      {showNetworkAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-background">
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>No Internet Connection</AlertTitle>
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <p>Please check your network settings. Some features may not work properly.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowNetworkAlert(false)}
                  className="self-end"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Location permission alert */}
      {showLocationAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-background mt-16">
          <Alert variant="destructive">
            <MapPin className="h-4 w-4" />
            <AlertTitle>Location Access Required</AlertTitle>
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <p>This app requires location access to function properly. Please enable location services.</p>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowLocationAlert(false)}
                  >
                    Dismiss
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={async () => {
                      const granted = await requestLocationPermission();
                      if (granted) {
                        setShowLocationAlert(false);
                      }
                    }}
                  >
                    Grant Access
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {children}
    </ConnectivityContext.Provider>
  );
};

export const useConnectivity = (): ConnectivityContextType => {
  const context = useContext(ConnectivityContext);
  if (context === undefined) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
};
