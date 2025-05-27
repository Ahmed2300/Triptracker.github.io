import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  MapPin, 
  Play, 
  Square, 
  Navigation, 
  Clock, 
  Map, 
  DollarSign, 
  Route, 
  Filter, 
  SortAsc, 
  SortDesc, 
  History, 
  XCircle, 
  CheckCircle2,
  Compass,
  Wifi,
  WifiOff,
  AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  listenToDriverActiveRide,
  listenToPendingRides, 
  updateRideRequest, 
  RideRequest,
  Location,
  checkDriverHasActiveRide,
  listenToDriverCompletedRides,
  cancelAcceptedRide
} from "@/services/firebaseService";
import { calculateDistance } from "@/utils/distanceCalculator";
import { calculateEstimatedPrice, formatPrice } from "@/utils/priceCalculator";
import RideRouteMap from "./RideRouteMap";
import DriverNavigationMap from "./DriverNavigationMap";
import { useAuth } from "@/contexts/AuthContext";
import { useConnectivity } from "@/contexts/ConnectivityContext";
import { isAndroidDevice, applyAndroidOptimizations } from "@/utils/deviceUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DriverInterfaceProps {
  onBack: () => void;
}

interface RideWithDistance extends RideRequest {
  distanceToDriver?: number;
}

type SortOption = 'distance' | 'price-asc' | 'price-desc' | 'time';
type DriverView = 'available' | 'active' | 'history';

// Define maximum distance (in miles) driver must be from pickup location to start the trip
const MAX_PICKUP_DISTANCE = 0.2; // 0.2 miles (about 320 meters)

// Define maximum distance (in miles) driver must be from destination location to end the trip
const MAX_DESTINATION_DISTANCE = 0.2; // 0.2 miles (about 320 meters)

const DriverInterface = ({ onBack }: DriverInterfaceProps) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [pendingRides, setPendingRides] = useState<RideWithDistance[]>([]);
  const [sortedRides, setSortedRides] = useState<RideWithDistance[]>([]);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [completedRides, setCompletedRides] = useState<RideRequest[]>([]);
  const [mileage, setMileage] = useState(0);
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedRideForPreview, setSelectedRideForPreview] = useState<RideWithDistance | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>('distance');
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<DriverView>('available');
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [connectionWarningShown, setConnectionWarningShown] = useState<boolean>(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { isOnline, hasLocationPermission, requestLocationPermission } = useConnectivity();

  // Detect Android device and apply optimizations
  useEffect(() => {
    const detectAndroid = async () => {
      const isAndroidResult = isAndroidDevice();
      setIsAndroid(isAndroidResult);
      
      if (isAndroidResult) {
        // Apply Android-specific optimizations
        await applyAndroidOptimizations();
        
        console.log('Android device detected, optimizations applied for driver interface');
        toast({
          title: "Android Detected",
          description: "Driver interface optimized for your Android device.",
        });
      }
    };
    
    detectAndroid();
  }, [toast]);

  // Monitor connectivity status
  useEffect(() => {
    // Only show warning once per session
    if (!isOnline && !connectionWarningShown) {
      toast({
        title: "No Internet Connection",
        description: "Driver mode requires a stable internet connection. Some features may be limited.",
        variant: "destructive",
      });
      setConnectionWarningShown(true);
    }
    
    // Reset warning flag when connection is restored
    if (isOnline && connectionWarningShown) {
      setConnectionWarningShown(false);
      toast({
        title: "Connection Restored",
        description: "You're back online. All driver features are now available.",
      });
    }
  }, [isOnline, connectionWarningShown, toast]);

  // Location permission checking
  useEffect(() => {
    if (!hasLocationPermission) {
      toast({
        title: "Location Access Required",
        description: "Drivers must share location to accept and complete rides.",
        variant: "destructive",
      });
      
      // Prompt for location permission
      requestLocationPermission();
    }
  }, [hasLocationPermission, requestLocationPermission, toast]);

  // Initial setup - check for active rides and get location
  useEffect(() => {
    setIsLoading(true);
    
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          toast({
            title: "Location Error",
            description: "Could not get your current location. Please enable location services.",
            variant: "destructive",
          });
        }
      );
    }

    // Check if driver has an active ride
    const checkActiveRide = async () => {
      try {
        const activeRideData = await checkDriverHasActiveRide();
        if (activeRideData) {
          setActiveRide(activeRideData);
          setCurrentView('active');
          
          // If the ride is already started, start tracking
          if (activeRideData.status === 'started') {
            setIsTracking(true);
            setMileage(activeRideData.calculatedMileage || 0);
            if (activeRideData.startTripLocation) {
              setStartLocation(activeRideData.startTripLocation);
            }
          }
        }
      } catch (error: any) {
        console.error('Error checking active rides:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkActiveRide();

    return () => {}; // Cleanup will be handled in other effects
  }, [toast]);

  // Listen to pending rides (only if no active ride)
  useEffect(() => {
    if (activeRide) return () => {};
    
    // Listen to pending rides
    const unsubscribe = listenToPendingRides((rides) => {
      setPendingRides(rides);
    });

    return unsubscribe;
 
  }, [activeRide]);

  // Listen to driver's active ride
  useEffect(() => {
    const unsubscribe = listenToDriverActiveRide((ride) => {
      if (ride) {
        // Only update if the ride data has actually changed
        if (!activeRide || activeRide.id !== ride.id || activeRide.status !== ride.status) {
          setActiveRide(ride);
          setCurrentView('active');
          
          // If the ride is started, ensure tracking is on
          if (ride.status === 'started') {
            setIsTracking(true);
            setMileage(ride.calculatedMileage || 0);
            if (ride.startTripLocation) {
              setStartLocation(ride.startTripLocation);
            }
          }
        }
      } else if (activeRide) {
        // If we had an active ride but now it's gone (completed or cancelled)
        setActiveRide(null);
        setIsTracking(false);
        setMileage(0);
        setStartLocation(null);
        setCurrentView('available');
      }
    });
    
    return unsubscribe;
  }, [activeRide]);

  // Listen to driver's completed rides
  useEffect(() => {
    if (currentView !== 'history') return () => {};
    
    const unsubscribe = listenToDriverCompletedRides((rides) => {
      setCompletedRides(rides);
    });
    
    return unsubscribe;
  }, [currentView]);

  // Calculate distances and sort rides whenever pending rides or current location changes
  useEffect(() => {
    if (!currentLocation || pendingRides.length === 0) {
      setSortedRides([]);
      return;
    }

    // Calculate distance from driver to each ride's pickup location
    const ridesWithDistance = pendingRides.map(ride => {
      const distance = calculateDistance(
        currentLocation,
        ride.pickupLocation
      );
      return { ...ride, distanceToDriver: distance };
    });

    // Apply distance filter if maxDistance is set
    let filteredRides = ridesWithDistance;
    if (maxDistance !== null) {
      filteredRides = ridesWithDistance.filter(ride => 
        ride.distanceToDriver <= maxDistance
      );
    }

    // Sort the rides based on the selected sort option
    sortRides(filteredRides, sortOption);
  }, [pendingRides, currentLocation, sortOption, maxDistance]);

  // Function to sort rides based on the selected option
  const sortRides = (rides: RideWithDistance[], option: SortOption) => {
    let sorted = [...rides];
    
    switch (option) {
      case 'distance':
        // Sort by distance (ascending - closest first)
        sorted.sort((a, b) => (a.distanceToDriver || 0) - (b.distanceToDriver || 0));
        break;
      case 'price-asc':
        // Sort by price (ascending - cheapest first)
        sorted.sort((a, b) => (a.estimatedPrice || 0) - (b.estimatedPrice || 0));
        break;
      case 'price-desc':
        // Sort by price (descending - most expensive first)
        sorted.sort((a, b) => (b.estimatedPrice || 0) - (a.estimatedPrice || 0));
        break;
      case 'time':
        // Sort by request time (newest first)
        sorted.sort((a, b) => b.requestTime - a.requestTime);
        break;
    }
    
    setSortedRides(sorted);
  };

  // Location tracking effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isTracking && activeRide && currentLocation && startLocation) {
      intervalId = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            // Calculate distance from start location
            const distance = calculateDistance(startLocation, newLocation);
            setMileage(distance);
            setCurrentLocation(newLocation);

            // Update Firebase with current location and mileage
            if (activeRide?.id) {
              updateRideRequest(activeRide.id, {
                ...activeRide,
                currentDriverLocation: newLocation,
                calculatedMileage: distance,
              });
            }
          });
        } else {
          // Simulate mileage increase for demo
          setMileage(prev => {
            const newMileage = prev + 0.1;
            if (activeRide?.id) {
              updateRideRequest(activeRide.id, {
                ...activeRide,
                calculatedMileage: newMileage,
              });
            }
            return newMileage;
          });
        }
      }, 5000); // Update every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTracking, activeRide, currentLocation, startLocation]);

  const calculateDistance = (start: Location, end: Location) => {
    // Simplified distance calculation (Haversine formula)
    const R = 3959; // Earth's radius in miles
    const dLat = (end.latitude - start.latitude) * Math.PI / 180;
    const dLng = (end.longitude - start.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(start.latitude * Math.PI / 180) * Math.cos(end.latitude * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const acceptRide = async (ride: RideRequest) => {
    // Network connectivity check
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "You need an internet connection to accept rides. Please check your connection and try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Location permission check
    if (!hasLocationPermission) {
      toast({
        title: "Location Access Required",
        description: "You must enable location services to accept rides.",
        variant: "destructive",
      });
      
      requestLocationPermission();
      return;
    }

    if (!currentLocation || !currentUser) {
      toast({
        title: "Authentication Required",
        description: "You must be signed in and have location access to accept rides.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if driver already has an active ride
    if (activeRide) {
      toast({
        title: "Active Ride in Progress",
        description: "You must complete your current ride before accepting a new one.",
        variant: "destructive",
      });
      return;
    }
    
    if (ride.id) {
      try {
        // Update ride status in Firebase
        await updateRideRequest(ride.id, {
          ...ride,
          status: 'accepted',
          driverId: currentUser.uid,
          driverName: currentUser.displayName || "Anonymous Driver",
          acceptTime: Date.now(),
          currentDriverLocation: currentLocation // Store initial driver location
        });
        
        toast({
          title: "Ride Accepted",
          description: `You've accepted ${ride.customerName || 'customer'}'s ride request.`,
        });
        
        // The active ride will be set by the listener
        setCurrentView('active');
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to accept ride. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const startTrip = async () => {
    if (!activeRide?.id || !currentLocation || !currentUser) {
      toast({
        title: "Error",
        description: "Cannot start trip. Please ensure you are signed in and have location access.",
        variant: "destructive",
      });
      return;
    }
    
    // Only start trips that are in accepted state
    if (activeRide.status !== 'accepted') {
      toast({
        title: "Invalid State",
        description: `Cannot start a trip that is in ${activeRide.status} state.`,
        variant: "destructive",
      });
      return;
    }
    
    // Check if driver is close enough to the pickup location
    if (activeRide.pickupLocation) {
      const distanceToPickup = calculateDistance(currentLocation, activeRide.pickupLocation);
      
      if (distanceToPickup > MAX_PICKUP_DISTANCE) {
        toast({
          title: "Too Far from Pickup Location",
          description: `You must be within ${MAX_PICKUP_DISTANCE.toFixed(1)} miles of the pickup location to start the trip. Current distance: ${distanceToPickup.toFixed(2)} miles.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    try {
      setStartLocation(currentLocation);
      setIsTracking(true);
      setMileage(activeRide.calculatedMileage || 0);
      
      await updateRideRequest(activeRide.id, {
        ...activeRide,
        status: 'started',
        startTime: Date.now(),
        startTripLocation: currentLocation,
      });

      toast({
        title: "Trip Started",
        description: "GPS tracking is now active. Drive safely!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start trip. Please try again.",
        variant: "destructive",
      });
    }
  };

  const endTrip = async () => {
    if (!activeRide?.id || !currentLocation || !currentUser) {
      toast({
        title: "Authentication Error",
        description: "Cannot end trip. Please ensure you are signed in and have location access.",
        variant: "destructive",
      });
      return;
    }
    
    // Only end trips that are in started state
    if (activeRide.status !== 'started') {
      toast({
        title: "Invalid State",
        description: `Cannot end a trip that is in ${activeRide.status} state.`,
        variant: "destructive",
      });
      return;
    }
    
    // Check if driver is close enough to the destination location
    if (activeRide.destinationLocation) {
      const distanceToDestination = calculateDistance(currentLocation, activeRide.destinationLocation);
      
      if (distanceToDestination > MAX_DESTINATION_DISTANCE) {
        toast({
          title: "Too Far from Destination",
          description: `You must be within ${MAX_DESTINATION_DISTANCE.toFixed(1)} miles of the destination to end the trip. Current distance: ${distanceToDestination.toFixed(2)} miles.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    try {
      // Stop tracking and capture final trip data
      setIsTracking(false);
      const finalMileage = mileage;
      const completedRide = {
        ...activeRide,
        status: 'completed' as const,
        endTime: Date.now(),
        calculatedMileage: finalMileage,
      };
      
      // Update Firebase
      await updateRideRequest(activeRide.id, completedRide);

      // Immediately update the UI without waiting for Firebase listener
      setActiveRide(null);
      setMileage(0);
      setStartLocation(null);
      setCurrentView('available');
      
      // Add the completed ride to the history
      setCompletedRides(prev => [{ ...completedRide, id: activeRide.id }, ...prev]);

      toast({
        title: "Trip Completed",
        description: `Final mileage: ${finalMileage.toFixed(2)} miles`,
        variant: "default",
      });
      
      // Show trip summary toast
      setTimeout(() => {
        toast({
          title: "Payment Processed",
          description: `Payment of ${formatPrice(completedRide.estimatedPrice || 0)} has been processed.`,
          variant: "default",
        });
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end trip. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Cancel an accepted ride (only if not started yet)
  const cancelAcceptedTrip = async () => {
    if (!activeRide?.id || !currentUser) {
      toast({
        title: "Authentication Error",
        description: "Cannot cancel ride. Please ensure you are signed in.",
        variant: "destructive",
      });
      return;
    }
    
    // Only cancel trips that are in accepted state (not started)
    if (activeRide.status !== 'accepted') {
      toast({
        title: "Invalid State",
        description: `Cannot cancel a trip that is in ${activeRide.status} state.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsCancelling(true);
    
    try {
      const result = await cancelAcceptedRide(activeRide.id);
      
      if (result.success) {
        toast({
          title: "Ride Cancelled",
          description: "The ride has been returned to the available rides list.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel ride.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-md mx-auto space-y-6 relative">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-100 transition-colors" onClick={onBack}>
              <ArrowLeft className="w-5 h-5 text-blue-700" />
            </Button>
            <h1 className="text-2xl font-bold text-blue-900">Driver</h1>
          </div>
          {isOnline ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1 px-3 py-1">
              <Wifi className="w-3 h-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1 px-3 py-1">
              <WifiOff className="w-3 h-3" />
              Offline
            </Badge>
          )}
        </div>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 pb-3 pt-5">
            <CardTitle className="flex items-center gap-2 text-white">
              <Navigation className="w-5 h-5" />
              Current Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {currentLocation ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-blue-800 font-medium">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 px-2">
                    Latitude
                  </Badge>
                  {currentLocation.latitude.toFixed(6)}
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-800 font-medium">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 px-2">
                    Longitude
                  </Badge>
                  {currentLocation.longitude.toFixed(6)}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2">
                <div className="animate-pulse flex space-x-2 items-center">
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
                  <p className="text-sm text-blue-600 ml-2">Getting location...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!isOnline && (
          <Alert variant="destructive" className="bg-red-50 border border-red-200 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <WifiOff className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <AlertTitle className="text-red-800 font-bold">No Connection</AlertTitle>
                <AlertDescription className="text-red-600">
                  You're offline. Please check your internet connection to continue accepting rides.
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as DriverView)} className="mt-2">
          <TabsList className="grid grid-cols-3 w-full bg-blue-50 p-1 border border-blue-100 rounded-xl">
            <TabsTrigger value="available" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
              <Filter className="w-4 h-4 mr-2" />
              Available
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
              <Compass className="w-4 h-4 mr-2" />
              Active
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>
          
          {/* Available Rides Tab */}
          <TabsContent value="available">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500">Loading available rides...</p>
                </CardContent>
              </Card>
            ) : !activeRide ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Available Rides</CardTitle>
                    <div className="text-xs text-gray-500">
                      {sortedRides.length} of {pendingRides.length} rides shown
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 pb-2">
                    <Select 
                      value={sortOption} 
                      onValueChange={(value) => setSortOption(value as SortOption)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <div className="flex items-center">
                          <SortAsc className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Sort by" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance">Nearest First</SelectItem>
                        <SelectItem value="price-desc">Highest Paying</SelectItem>
                        <SelectItem value="price-asc">Lowest Price</SelectItem>
                        <SelectItem value="time">Most Recent</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={maxDistance === null ? 'all' : maxDistance.toString()} 
                      onValueChange={(value) => setMaxDistance(value === 'all' ? null : parseFloat(value))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <div className="flex items-center">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Max Distance" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Distances</SelectItem>
                        <SelectItem value="1">Within 1 mile</SelectItem>
                        <SelectItem value="3">Within 3 miles</SelectItem>
                        <SelectItem value="5">Within 5 miles</SelectItem>
                        <SelectItem value="10">Within 10 miles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {sortedRides.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No ride requests available</p>
                  ) : (
                    <ScrollArea className="h-[400px] pr-2">
                      <div className="space-y-4">
                        {sortedRides.map((ride) => (
                          <div key={ride.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <h3 className="font-medium">{ride.customerName || 'Customer'}</h3>
                                <div className="text-sm text-gray-600">
                                  <p>
                                    <MapPin className="w-3 h-3 inline mr-1" />
                                    {ride.pickupLocationDescription || 'Pickup location'}
                                  </p>
                                  <p>
                                    <Route className="w-3 h-3 inline mr-1" />
                                    {ride.destinationDescription || 'Destination'}
                                  </p>
                                  {ride.estimatedPrice !== undefined && (
                                    <p>
                                      <DollarSign className="w-3 h-3 inline mr-1" />
                                      Offered: {formatPrice(ride.estimatedPrice)}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {new Date(ride.requestTime).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                              <Badge className="ml-2">
                                {ride.distanceToDriver !== undefined 
                                  ? `${ride.distanceToDriver.toFixed(1)} mi` 
                                  : 'Distance unknown'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRideForPreview(ride)}
                              >
                                <Map className="w-4 h-4 mr-1" />
                                View Map
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => acceptRide(ride)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertTitle>Active Ride in Progress</AlertTitle>
                    <AlertDescription>
                      You must complete your current ride before accepting a new one.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
            
            {selectedRideForPreview && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Route Preview</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedRideForPreview(null)}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <RideRouteMap 
                      pickupLocation={selectedRideForPreview.pickupLocation}
                      destinationLocation={selectedRideForPreview.destinationLocation}
                      currentLocation={currentLocation}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Estimated distance: {calculateDistance(
                      selectedRideForPreview.pickupLocation,
                      selectedRideForPreview.destinationLocation
                    ).toFixed(1)} miles
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Active Ride Tab */}
          <TabsContent value="active">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500">Loading active ride...</p>
                </CardContent>
              </Card>
            ) : activeRide ? (
              <div className="space-y-4">
                <Card className="border-0 shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-500 pb-3 pt-5">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white">
                        <span>Current Ride</span>
                        <Badge variant={activeRide.status === 'started' ? 'default' : 'outline'} 
                          className={activeRide.status === 'started' 
                            ? 'bg-green-500 text-white border-none animate-pulse' 
                            : 'bg-blue-100 text-blue-800 border-blue-200'}>
                          {activeRide.status === 'accepted' ? 'Accepted' : 'In Progress'}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-0">
                    <div className="bg-white p-5 divide-y divide-blue-100">
                      <div className="flex justify-between py-3 items-center">
                        <h3 className="font-medium text-blue-900 flex items-center gap-2">
                          <div className="bg-blue-100 p-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                          </div>
                          Customer
                        </h3>
                        <span className="font-semibold text-blue-700">{activeRide.customerName || 'Anonymous'}</span>
                      </div>
                      <div className="flex justify-between py-3 items-center">
                        <h3 className="font-medium text-blue-900 flex items-center gap-2">
                          <div className="bg-blue-100 p-1 rounded-full">
                            <MapPin className="w-4 h-4 text-blue-600" />
                          </div>
                          Pickup
                        </h3>
                        <span className="text-blue-700 text-right max-w-[200px]">{activeRide.pickupLocationDescription}</span>
                      </div>
                      <div className="flex justify-between py-3 items-center">
                        <h3 className="font-medium text-blue-900 flex items-center gap-2">
                          <div className="bg-blue-100 p-1 rounded-full">
                            <Route className="w-4 h-4 text-blue-600" />
                          </div>
                          Destination
                        </h3>
                        <span className="text-blue-700 text-right max-w-[200px]">{activeRide.destinationDescription}</span>
                      </div>
                      <div className="flex justify-between py-3 items-center">
                        <h3 className="font-medium text-blue-900 flex items-center gap-2">
                          <div className="bg-blue-100 p-1 rounded-full">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                          </div>
                          Fare
                        </h3>
                        <span className="font-bold text-green-600">{formatPrice(activeRide.estimatedPrice || 0)}</span>
                      </div>
                      {activeRide.status === 'started' && (
                        <div className="flex justify-between py-3 items-center">
                          <h3 className="font-medium text-blue-900 flex items-center gap-2">
                            <div className="bg-blue-100 p-1 rounded-full">
                              <Route className="w-4 h-4 text-blue-600" />
                            </div>
                            Current Mileage
                          </h3>
                          <span className="font-bold text-indigo-600 flex items-center">
                            {mileage.toFixed(2)} 
                            <span className="ml-1 text-sm font-normal text-indigo-500">miles</span>
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="h-[300px] relative overflow-hidden rounded-lg shadow-inner">
                      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-white/80 to-transparent h-10 pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-white/80 to-transparent h-10 pointer-events-none"></div>
                      <div className="absolute top-2 left-2 z-20 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-1.5 text-xs font-medium text-blue-800 flex items-center gap-1.5">
                        <Navigation className="w-3 h-3 text-blue-600" />
                        {activeRide.status === 'accepted' ? 'Navigate to pickup' : 'Navigate to destination'}
                      </div>
                      <DriverNavigationMap
                        currentLocation={currentLocation}
                        destination={activeRide.status === 'accepted' 
                          ? activeRide.pickupLocation 
                          : activeRide.destinationLocation}
                        isNavigatingToPickup={activeRide.status === 'accepted'}
                      />
                      <div className="absolute bottom-2 right-2 z-20 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-1.5 text-xs font-medium text-blue-800">
                        {activeRide.status === 'accepted' 
                          ? 'ETA to pickup: 5 mins' 
                          : 'ETA to destination: 12 mins'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="space-y-3 mt-4">
                  {activeRide.status === 'accepted' && (
                    <>
                      <Button 
                        onClick={startTrip} 
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all border-0 py-6" 
                        size="lg"
                      >
                        <div className="bg-white/20 rounded-full p-1.5 mr-3">
                          <Play className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-base">Start Trip</span>
                      </Button>
                      
                      <Button 
                        onClick={cancelAcceptedTrip} 
                        variant="outline" 
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 py-5" 
                        size="lg"
                        disabled={isCancelling}
                      >
                        <XCircle className="w-4 h-4 mr-2 opacity-80" />
                        {isCancelling ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
                            <span>Cancelling...</span>
                          </div>
                        ) : 'Cancel Ride'}
                      </Button>
                    </>
                  )}
                  
                  {activeRide.status === 'started' && (
                    <Button 
                      onClick={endTrip} 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-md hover:shadow-lg transition-all border-0 py-6" 
                      size="lg"
                    >
                      <div className="bg-white/20 rounded-full p-1.5 mr-3">
                        <Square className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-base">End Trip</span>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 pb-6">
                  <p className="text-gray-500 text-center py-4">No active rides</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Completed Rides</CardTitle>
              </CardHeader>
              <CardContent>
                {completedRides.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No completed rides yet</p>
                ) : (
                  <ScrollArea className="h-[400px] pr-2">
                    <div className="space-y-4">
                      {completedRides.map(ride => (
                        <div key={ride.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{ride.customerName || 'Customer'}</h3>
                              <p className="text-sm text-gray-500">
                                {new Date(ride.endTime || 0).toLocaleString()}
                              </p>
                            </div>
                            <Badge>{formatPrice(ride.estimatedPrice || 0)}</Badge>
                          </div>
                          <div className="text-sm">
                            <p><MapPin className="w-3 h-3 inline mr-1" />{ride.pickupLocationDescription}</p>
                            <p><Route className="w-3 h-3 inline mr-1" />{ride.destinationDescription}</p>
                            <p><Route className="w-3 h-3 inline mr-1" />Distance: {(ride.calculatedMileage || 0).toFixed(2)} miles</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DriverInterface;
