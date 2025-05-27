import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Removed duplicate import
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
  }, []);

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
            
            // Calculate distance from start location (simplified)
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

  const acceptRide = (ride: RideRequest) => {
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
      // Update ride status in Firebase
      updateRideRequest(ride.id, {
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
    }
  };

  const startTrip = () => {
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
    
    setStartLocation(currentLocation);
    setIsTracking(true);
    setMileage(activeRide.calculatedMileage || 0);
    
    updateRideRequest(activeRide.id, {
      ...activeRide,
      status: 'started',
      startTime: Date.now(),
      startTripLocation: currentLocation,
    });

    toast({
      title: "Trip Started",
      description: "GPS tracking is now active. Drive safely!",
    });
  };

  const endTrip = () => {
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
    updateRideRequest(activeRide.id, completedRide);

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Driver</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Current Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentLocation ? (
              <p className="text-sm text-gray-600">
                Lat: {currentLocation.latitude.toFixed(6)}, Lng: {currentLocation.longitude.toFixed(6)}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Getting location...</p>
            )}
          </CardContent>
        </Card>

        {!activeRide && (
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
                sortedRides.map((ride) => (
                  <div key={ride.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-medium">{ride.customerName || 'Customer'}</h3>
                        <div className="text-sm text-gray-600">
                          <p><MapPin className="w-3 h-3 inline mr-1" />From: {ride.pickupAddress}</p>
                          {ride.destinationAddress && (
                            <p><MapPin className="w-3 h-3 inline mr-1" />To: {ride.destinationAddress}</p>
                          )}
                        </div>
                        {ride.estimatedPrice && (
                          <p className="text-sm font-medium text-green-600">
                            <DollarSign className="w-3 h-3 inline mr-1" />
                            Offered: {formatPrice(ride.estimatedPrice)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(ride.requestTime).toLocaleTimeString()}
                          </span>
                          {ride.distanceToDriver !== undefined && (
                            <span className="font-medium text-blue-500">
                              <Navigation className="w-3 h-3 inline mr-1" />
                              {ride.distanceToDriver.toFixed(1)} miles away
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    
                    {selectedRideForPreview?.id === ride.id && ride.pickupLocation && ride.destinationLocation && (
                      <div className="my-3">
                        <RideRouteMap
                          pickupLocation={ride.pickupLocation}
                          destinationLocation={ride.destinationLocation}
                          onDistanceCalculated={setEstimatedDistance}
                        />
                        <div className="flex items-center mt-2 text-sm">
                          <Route className="w-4 h-4 mr-1 text-blue-600" />
                          <span>{estimatedDistance.toFixed(1)} miles</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {selectedRideForPreview?.id !== ride.id && (
                        <Button 
                          onClick={() => {
                            if (ride.pickupLocation && ride.destinationLocation) {
                              setSelectedRideForPreview(ride);
                              setEstimatedDistance(0);
                            } else {
                              toast({
                                title: "Map Unavailable",
                                description: "Location data is incomplete for this ride.",
                                variant: "destructive"
                              });
                            }
                          }} 
                          variant="outline" 
                          className="flex-1" 
                          size="sm"
                        >
                          <Map className="w-4 h-4 mr-2" /> View Route
                        </Button>
                      )}
                      {selectedRideForPreview?.id === ride.id && (
                        <Button 
                          onClick={() => setSelectedRideForPreview(null)} 
                          variant="outline" 
                          className="flex-1" 
                          size="sm"
                        >
                          Hide Map
                        </Button>
                      )}
                      <Button 
                        onClick={() => acceptRide(ride)} 
                        className="flex-1" 
                        size="sm"
                      >
                        Accept Ride
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {activeRide && (
          <Card>
            <CardHeader>
              <CardTitle>Active Ride</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">{activeRide.customerName || 'Customer'}</h3>
                <div className="text-sm text-gray-600">
                  <p><MapPin className="w-3 h-3 inline mr-1" />From: {activeRide.pickupAddress}</p>
                  {activeRide.destinationAddress && (
                    <p><MapPin className="w-3 h-3 inline mr-1" />To: {activeRide.destinationAddress}</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge variant={activeRide.status === 'started' ? 'default' : 'secondary'}>
                    {activeRide.status === 'accepted' ? 'Accepted' : 
                     activeRide.status === 'started' ? 'In Progress' : 'Completed'}
                  </Badge>
                </div>
                {activeRide.estimatedPrice && (
                  <div className="flex items-center justify-between">
                    <span>Estimated Fare:</span>
                    <span className="font-medium text-green-600">{formatPrice(activeRide.estimatedPrice)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium">Cash</span>
                </div>
                {activeRide.status === 'started' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Distance:</span>
                      <span className="font-medium">{mileage.toFixed(2)} miles</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Current Fare:</span>
                      <span className="font-medium text-blue-600">
                        {formatPrice(calculateEstimatedPrice(mileage))}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Navigation Map Section */}
              {(activeRide.status === 'accepted' || activeRide.status === 'started') && currentLocation && (
                <div className="mb-4">
                  <DriverNavigationMap 
                    currentLocation={currentLocation}
                    pickupLocation={activeRide.pickupLocation}
                    destinationLocation={activeRide.destinationLocation}
                    tripStatus={activeRide.status}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                {activeRide.status === 'accepted' && (
                  <Button onClick={startTrip} className="w-full" size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Start Trip
                  </Button>
                )}

                {activeRide.status === 'started' && (
                  <Button onClick={endTrip} variant="destructive" className="w-full" size="lg">
                    <Square className="w-4 h-4 mr-2" />
                    End Trip
                  </Button>
                )}

                {activeRide.status === 'completed' && (
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800 font-medium">Trip Completed!</p>
                    <p className="text-green-600">Final distance: {mileage.toFixed(2)} miles</p>
                    <p className="text-green-600">Final fare: {formatPrice(calculateEstimatedPrice(mileage))}</p>
                    <p className="text-green-600">Destination reached: {activeRide.destinationAddress}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DriverInterface;
