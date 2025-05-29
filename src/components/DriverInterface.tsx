import { useState, useEffect } from "react"; // useContext was not used directly here
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
  // SortDesc, // Not used
  History,
  XCircle,
  CheckCircle2,
  Compass,
  Wifi,
  WifiOff,
  AlertCircle,
  // Phone, // Not used
  User,
} from "lucide-react";
import CallButton from "./CallButton"; // Removed duplicate import
import { useToast } from "@/hooks/use-toast";
import {
  listenToDriverActiveRide,
  listenToPendingRides,
  updateRideRequest,
  RideRequest,
  Location,
  checkDriverHasActiveRide,
  listenToDriverCompletedRides,
  cancelAcceptedRide,
} from "@/services/firebaseService";
import { calculateDistance } from "@/utils/distanceCalculator"; // Will use this consistently
import { formatPrice } from "@/utils/priceCalculator"; // calculateEstimatedPrice was not used directly
import RideRouteMap from "./RideRouteMap";
import DriverNavigationMap from "./DriverNavigationMap";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { createRideUpdateNotificationForDriver } from "@/services/notificationService";
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
  // const [estimatedDistance, setEstimatedDistance] = useState(0); // Unused state
  const [sortOption, setSortOption] = useState<SortOption>('distance');
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<DriverView>('available');
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [_isAndroid, setIsAndroid] = useState<boolean>(false); // Renamed as isAndroid state value is not directly used in render
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
    if (!isOnline && !connectionWarningShown) {
      toast({
        title: "No Internet Connection",
        description: "Driver mode requires a stable internet connection. Some features may be limited.",
        variant: "destructive",
      });
      setConnectionWarningShown(true);
    }

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
      requestLocationPermission();
    }
  }, [hasLocationPermission, requestLocationPermission, toast]);

  // Initial setup - check for active rides and get location
  useEffect(() => {
    setIsLoading(true);
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

    const checkActiveRide = async () => {
      try {
        const activeRideData = await checkDriverHasActiveRide();
        if (activeRideData) {
          setActiveRide(activeRideData);
          setCurrentView('active');
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
    // No explicit cleanup here as listeners have their own.
  }, [toast]); // currentUser might be a dependency if checkDriverHasActiveRide relies on it passed explicitly

  // Listen to pending rides (only if no active ride)
  useEffect(() => {
    if (activeRide || currentView !== 'available') { // Also check currentView to avoid unnecessary listeners
        setPendingRides([]); // Clear pending rides if not in 'available' view or if active ride exists
        return;
    }
    
    const unsubscribe = listenToPendingRides((rides) => {
      setPendingRides(rides);
    });

    return unsubscribe;
  }, [activeRide, currentView]);

  // Listen to driver's active ride
  useEffect(() => {
    const unsubscribe = listenToDriverActiveRide((ride) => {
      if (ride) {
        if (!activeRide || activeRide.id !== ride.id || activeRide.status !== ride.status) {
          setActiveRide(ride);
          setCurrentView('active');
          if (ride.status === 'started') {
            setIsTracking(true);
            setMileage(ride.calculatedMileage || 0);
            if (ride.startTripLocation) {
              setStartLocation(ride.startTripLocation);
            }
          }
        }
      } else if (activeRide) {
        setActiveRide(null);
        setIsTracking(false);
        setMileage(0);
        setStartLocation(null);
        setCurrentView('available');
      }
    });
    return unsubscribe;
  }, [activeRide]); // Dependencies are correct

  // Listen to driver's completed rides
  useEffect(() => {
    if (currentView !== 'history') {
        setCompletedRides([]); // Clear completed rides if not in 'history' view
        return;
    }
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

    const ridesWithDistance = pendingRides.map(ride => {
      const distance = calculateDistance( // Uses imported calculateDistance
        currentLocation,
        ride.pickupLocation
      );
      return { ...ride, distanceToDriver: distance };
    });

    let filteredRides = ridesWithDistance;
    if (maxDistance !== null) {
      filteredRides = ridesWithDistance.filter(ride =>
        ride.distanceToDriver !== undefined && ride.distanceToDriver <= maxDistance
      );
    }

    sortRides(filteredRides, sortOption);
  }, [pendingRides, currentLocation, sortOption, maxDistance]); // sortRides should be stable or memoized if complex

  // Function to sort rides based on the selected option (memoized for stability if it were complex)
  const sortRides = (rides: RideWithDistance[], option: SortOption) => {
    let sorted = [...rides];
    switch (option) {
      case 'distance':
        sorted.sort((a, b) => (a.distanceToDriver || Infinity) - (b.distanceToDriver || Infinity));
        break;
      case 'price-asc':
        sorted.sort((a, b) => (a.estimatedPrice || 0) - (b.estimatedPrice || 0));
        break;
      case 'price-desc':
        sorted.sort((a, b) => (b.estimatedPrice || 0) - (a.estimatedPrice || 0));
        break;
      case 'time':
        sorted.sort((a, b) => b.requestTime - a.requestTime);
        break;
    }
    setSortedRides(sorted);
  };

  // Location tracking effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (isTracking && activeRide && currentLocation && startLocation) {
      intervalId = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            const distance = calculateDistance(startLocation, newLocation); // Uses imported calculateDistance
            setMileage(distance);
            setCurrentLocation(newLocation); // Update current location based on tracking

            if (activeRide?.id) { // Use optional chaining for safety
              // Update only specific fields to avoid sending stale ...activeRide data
              updateRideRequest(activeRide.id, {
                currentDriverLocation: newLocation,
                calculatedMileage: distance,
              });
            }
          });
        } else {
          // Simulate mileage increase for demo
          setMileage(prev => {
            const newMileage = prev + 0.1;
            if (activeRide?.id) { // Use optional chaining
              updateRideRequest(activeRide.id, {
                // ...activeRide, // Potentially stale
                calculatedMileage: newMileage,
              });
            }
            return newMileage;
          });
        }
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTracking, activeRide, currentLocation, startLocation]); // updateRideRequest should be stable

  // REMOVED local calculateDistance function, will use imported one.

  const acceptRide = async (ride: RideRequest) => {
    if (!isOnline) {
      toast({ title: "No Internet Connection", description: "You need an internet connection to accept rides.", variant: "destructive" });
      return;
    }
    if (!hasLocationPermission) {
      toast({ title: "Location Access Required", description: "You must enable location services to accept rides.", variant: "destructive" });
      requestLocationPermission();
      return;
    }
    if (!currentLocation || !currentUser) {
      toast({ title: "Authentication Required", description: "You must be signed in and have location access.", variant: "destructive" });
      return;
    }
    if (activeRide) {
      toast({ title: "Active Ride in Progress", description: "Complete your current ride before accepting another.", variant: "destructive" });
      return;
    }

    if (ride.id) {
      try {
        const updatedRideData = {
          status: 'accepted' as const,
          driverId: currentUser.uid,
          driverName: currentUser.displayName || "Anonymous Driver",
          acceptTime: Date.now(),
          currentDriverLocation: currentLocation
        };
        await updateRideRequest(ride.id, updatedRideData);
        toast({ title: "Ride Accepted", description: `Ride from ${ride.customerName || 'customer'} accepted.` });
        createRideUpdateNotificationForDriver(
          { ...ride, ...updatedRideData },
          "Ride Accepted",
          `Accepted ride from ${ride.customerName || 'a customer'}. Pickup: ${ride.pickupAddress || ride.pickupLocationDescription || 'Unknown'}`,
          "medium"
        );
        // Active ride state will be updated by the listener
      } catch (error) {
        toast({ title: "Error Accepting Ride", description: "Failed to accept ride. Please try again.", variant: "destructive" });
      }
    }
  };

  const startTrip = async () => {
    if (!activeRide?.id || !currentLocation || !currentUser) {
      toast({ title: "Error Starting Trip", description: "Cannot start trip. Ensure you're signed in with location access.", variant: "destructive" });
      return;
    }
    if (activeRide.status !== 'accepted') {
      toast({ title: "Invalid State", description: `Cannot start a trip in '${activeRide.status}' state.`, variant: "destructive" });
      return;
    }
    if (activeRide.pickupLocation) {
      const distanceToPickup = calculateDistance(currentLocation, activeRide.pickupLocation); // Uses imported
      if (distanceToPickup > MAX_PICKUP_DISTANCE) {
        toast({ title: "Too Far from Pickup", description: `Must be within ${MAX_PICKUP_DISTANCE.toFixed(1)} miles of pickup. Currently ${distanceToPickup.toFixed(2)} miles.`, variant: "destructive" });
        return;
      }
    }

    try {
      setStartLocation(currentLocation);
      setIsTracking(true);
      setMileage(activeRide.calculatedMileage || 0); // Initialize mileage from ride data if available
      
      const updatedRideData = {
        status: 'started' as const,
        startTime: Date.now(),
        startTripLocation: currentLocation,
      };
      await updateRideRequest(activeRide.id, updatedRideData);
      toast({ title: "Trip Started", description: "GPS tracking active. Drive safely!" });
      createRideUpdateNotificationForDriver(
        { ...activeRide, ...updatedRideData }, // Spread activeRide first
        "Trip Started",
        `Trip with ${activeRide.customerName || 'customer'} started.`,
        "medium"
      );
    } catch (error) {
      toast({ title: "Error Starting Trip", description: "Failed to start trip.", variant: "destructive" });
    }
  };

  const endTrip = async () => {
    if (!activeRide?.id || !currentLocation || !currentUser) {
      toast({ title: "Error Ending Trip", description: "Cannot end trip. Ensure you're signed in with location access.", variant: "destructive" });
      return;
    }
    if (activeRide.status !== 'started') {
      toast({ title: "Invalid State", description: `Cannot end a trip in '${activeRide.status}' state.`, variant: "destructive" });
      return;
    }
    if (activeRide.destinationLocation) {
      const distanceToDestination = calculateDistance(currentLocation, activeRide.destinationLocation); // Uses imported
      if (distanceToDestination > MAX_DESTINATION_DISTANCE) {
        toast({ title: "Too Far from Destination", description: `Must be within ${MAX_DESTINATION_DISTANCE.toFixed(1)} miles of destination. Currently ${distanceToDestination.toFixed(2)} miles.`, variant: "destructive" });
        return;
      }
    }

    try {
      setIsTracking(false);
      const finalMileage = mileage; // Use the current tracked mileage
      const completedRideData = {
        status: 'completed' as const,
        endTime: Date.now(),
        calculatedMileage: finalMileage,
        // endTripLocation: currentLocation, // Optionally store end location
      };
      await updateRideRequest(activeRide.id, completedRideData);

      const fullCompletedRide = { ...activeRide, ...completedRideData, id: activeRide.id };
      
      createRideUpdateNotificationForDriver(
        fullCompletedRide,
        "Trip Completed",
        `Trip completed! Distance: ${finalMileage.toFixed(2)} miles.`,
        "high"
      );
      
      setCompletedRides(prev => [fullCompletedRide, ...prev]); // Add to local history immediately
      
      // Reset active ride state locally (listener will also confirm this)
      setActiveRide(null);
      setMileage(0);
      setStartLocation(null);
      setCurrentView('available');

      toast({ title: "Trip Completed", description: `Final mileage: ${finalMileage.toFixed(2)} miles.` });
      setTimeout(() => {
        toast({ title: "Payment Processed", description: `Payment of ${formatPrice(fullCompletedRide.estimatedPrice || 0)} processed.` });
      }, 1500);

    } catch (error) {
      toast({ title: "Error Ending Trip", description: "Failed to end trip.", variant: "destructive" });
    }
  };

  const cancelAcceptedTrip = async () => {
    if (!activeRide?.id || !currentUser) {
      toast({ title: "Authentication Error", description: "Cannot cancel ride.", variant: "destructive" });
      return;
    }
    if (activeRide.status !== 'accepted') {
      toast({ title: "Invalid State", description: `Cannot cancel a trip in '${activeRide.status}' state.`, variant: "destructive" });
      return;
    }
    setIsCancelling(true);
    try {
      const result = await cancelAcceptedRide(activeRide.id);
      if (result.success) {
        toast({ title: "Ride Cancelled", description: "Ride returned to available list." });
        createRideUpdateNotificationForDriver(
          { ...activeRide, status: 'pending' as const }, // Or 'cancelled' depending on desired user state
          "Ride Cancelled by Driver",
          `You cancelled the ride with ${activeRide.customerName || 'a customer'}.`,
          "medium"
        );
        // Active ride state will be updated by the listener, or reset manually:
        // setActiveRide(null); 
        // setCurrentView('available');
      }
    } catch (error: any) {
      toast({ title: "Error Cancelling Ride", description: error.message || "Failed to cancel ride.", variant: "destructive" });
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
          <div className="flex items-center gap-2">
            <NotificationCenter variant="ghost" />
            {isOnline ? (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1 px-3 py-1">
                <Wifi className="w-3 h-3" /> Online
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1 px-3 py-1">
                <WifiOff className="w-3 h-3" /> Offline
              </Badge>
            )}
          </div>
        </div>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 pb-3 pt-5">
            <CardTitle className="flex items-center gap-2 text-white">
              <Navigation className="w-5 h-5" /> Current Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {currentLocation ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-blue-800 font-medium">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 px-2">Latitude</Badge>
                  {currentLocation.latitude.toFixed(6)}
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-800 font-medium">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 px-2">Longitude</Badge>
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
              <Filter className="w-4 h-4 mr-2" /> Available
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
              <Compass className="w-4 h-4 mr-2" /> Active
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
              <History className="w-4 h-4 mr-2" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            {isLoading && currentView === 'available' && pendingRides.length === 0 ? ( // More specific loading for this tab
              <Card><CardContent className="pt-6"><p className="text-center text-gray-500">Loading available rides...</p></CardContent></Card>
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
                    <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                      <SelectTrigger className="w-[180px]">
                        <div className="flex items-center"><SortAsc className="w-4 h-4 mr-2" /><SelectValue placeholder="Sort by" /></div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance">Nearest First</SelectItem>
                        <SelectItem value="price-desc">Highest Paying</SelectItem>
                        <SelectItem value="price-asc">Lowest Price</SelectItem>
                        <SelectItem value="time">Most Recent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={maxDistance === null ? 'all' : maxDistance.toString()} onValueChange={(value) => setMaxDistance(value === 'all' ? null : parseFloat(value))}>
                      <SelectTrigger className="w-[180px]">
                        <div className="flex items-center"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Max Distance" /></div>
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
                    <p className="text-gray-500 text-center py-4">No ride requests available matching your criteria.</p>
                  ) : (
                    <ScrollArea className="h-[400px] pr-3"> {/* Added pr-3 for scrollbar */}
                      <div className="space-y-3">
                        {sortedRides.map(ride => (
                          <div key={ride.id} className="border rounded-lg p-3.5 space-y-2 shadow-sm hover:shadow-md transition-shadow bg-white">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <h3 className="font-semibold text-md text-blue-800">{ride.customerName || 'Customer Request'}</h3>
                                  {ride.customerId && (
                                    <CallButton
                                      userId={ride.customerId}
                                      name={ride.customerName || 'Customer'}
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 p-1 text-blue-600 hover:bg-blue-100 rounded-full"
                                    />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <MapPin className="w-4 h-4 inline mr-1.5 text-blue-500 flex-shrink-0" />
                                  <span className="truncate">From: {ride.pickupAddress || ride.pickupLocationDescription || 'Not specified'}</span>
                                </p>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <Route className="w-4 h-4 inline mr-1.5 text-blue-500 flex-shrink-0" />
                                   <span className="truncate">To: {ride.destinationAddress || ride.destinationDescription || 'Not specified'}</span>
                                </p>
                                {ride.estimatedPrice !== undefined && (
                                  <p className="text-sm text-green-700 font-semibold flex items-center mt-0.5">
                                    <DollarSign className="w-4 h-4 inline mr-1.5 text-green-500 flex-shrink-0" />
                                    {formatPrice(ride.estimatedPrice)}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1 flex items-center">
                                  <Clock className="w-3.5 h-3.5 inline mr-1.5 text-gray-400 flex-shrink-0" />
                                  {new Date(ride.requestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 px-2.5 py-1 text-xs whitespace-nowrap ml-2">
                                {ride.distanceToDriver !== undefined
                                  ? `${ride.distanceToDriver.toFixed(1)} mi`
                                  : 'N/A'}
                              </Badge>
                            </div>
                            <Separator className="my-2.5" />
                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                              <Button variant="outline" size="sm" className="text-blue-700 border-blue-300 hover:bg-blue-50" onClick={() => setSelectedRideForPreview(ride)}>
                                <Map className="w-4 h-4 mr-1.5" /> View Map
                              </Button>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => acceptRide(ride)} disabled={!isOnline || !hasLocationPermission}>
                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Accept
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
              <Card><CardContent className="pt-6">
                <Alert><AlertCircle className="w-4 h-4" /><AlertTitle>Active Ride in Progress</AlertTitle><AlertDescription>Complete current ride to see available rides.</AlertDescription></Alert>
              </CardContent></Card>
            )}
            {selectedRideForPreview && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Route Preview</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRideForPreview(null)}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 rounded-md overflow-hidden border">
                    <RideRouteMap
                      pickupLocation={selectedRideForPreview.pickupLocation}
                      destinationLocation={selectedRideForPreview.destinationLocation}
                      currentLocation={currentLocation}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Est. Trip Distance: {calculateDistance( // Uses imported
                      selectedRideForPreview.pickupLocation,
                      selectedRideForPreview.destinationLocation
                    ).toFixed(1)} miles
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="active">
            {isLoading && !activeRide ? ( // More specific loading for this tab
              <Card><CardContent className="pt-6"><p className="text-center text-gray-500">Loading active ride...</p></CardContent></Card>
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
                      <div className="flex py-3 items-center">
                        <h3 className="font-medium text-blue-900 flex items-center gap-2 w-1/3">
                          <div className="bg-blue-100 p-1.5 rounded-full">
                            <User className="w-4 h-4 text-blue-600" /> {/* Replaced SVG with User Icon */}
                          </div>
                          Customer
                        </h3>
                        <span className="font-semibold text-blue-700 flex-1 mx-2 truncate">{activeRide.customerName || 'Anonymous'}</span>
                        {activeRide.customerId && (
                          <CallButton userId={activeRide.customerId} name={activeRide.customerName || 'Customer'} variant="outline" size="sm" className="bg-blue-50 hover:bg-blue-100 text-blue-700"/>
                        )}
                      </div>
                      <div className="flex justify-between py-3 items-center">
                        <h3 className="font-medium text-blue-900 flex items-center gap-2 w-1/3">
                          <div className="bg-blue-100 p-1.5 rounded-full"><MapPin className="w-4 h-4 text-blue-600" /></div>Pickup
                        </h3>
                        <span className="text-blue-700 text-right truncate max-w-[calc(66%-1rem)]">{activeRide.pickupLocationDescription || activeRide.pickupAddress}</span>
                      </div>
                      <div className="flex justify-between py-3 items-center">
                        <h3 className="font-medium text-blue-900 flex items-center gap-2 w-1/3">
                          <div className="bg-blue-100 p-1.5 rounded-full"><Route className="w-4 h-4 text-blue-600" /></div>Destination
                        </h3>
                        <span className="text-blue-700 text-right truncate max-w-[calc(66%-1rem)]">{activeRide.destinationDescription || activeRide.destinationAddress}</span>
                      </div>
                      <div className="flex justify-between py-3 items-center">
                        <h3 className="font-medium text-blue-900 flex items-center gap-2 w-1/3">
                          <div className="bg-blue-100 p-1.5 rounded-full"><DollarSign className="w-4 h-4 text-blue-600" /></div>Fare
                        </h3>
                        <span className="font-bold text-green-600">{formatPrice(activeRide.estimatedPrice || 0)}</span>
                      </div>
                      {activeRide.status === 'started' && (
                        <div className="flex justify-between py-3 items-center">
                          <h3 className="font-medium text-blue-900 flex items-center gap-2 w-1/3">
                            <div className="bg-blue-100 p-1.5 rounded-full"><Navigation className="w-4 h-4 text-blue-600" /></div>Mileage
                          </h3>
                          <span className="font-bold text-indigo-600 flex items-center">
                            {mileage.toFixed(2)} <span className="ml-1 text-sm font-normal text-indigo-500">miles</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="h-[300px] relative overflow-hidden rounded-lg shadow-inner border-t border-blue-100">
                      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-white/80 via-white/50 to-transparent h-12 pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-white/80 via-white/50 to-transparent h-12 pointer-events-none"></div>
                      <div className="absolute top-2.5 left-2.5 z-20 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-1.5 text-xs font-medium text-blue-800 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        {activeRide.status === 'accepted' ? 'Navigate to pickup' : 'Navigate to destination'}
                      </div>
                      <DriverNavigationMap
                        currentLocation={currentLocation}
                        destination={activeRide.status === 'accepted' ? activeRide.pickupLocation : activeRide.destinationLocation}
                        isNavigatingToPickup={activeRide.status === 'accepted'}
                      />
                       {/* ETA display (placeholder) */}
                       {/* <div className="absolute bottom-2.5 right-2.5 z-20 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-1.5 text-xs font-medium text-blue-800">
                        {activeRide.status === 'accepted' ? 'ETA to pickup: ~5 mins' : 'ETA to destination: ~12 mins'}
                      </div> */}
                    </div>
                  </CardContent>
                </Card>
                <div className="space-y-3 mt-4">
                  {activeRide.status === 'accepted' && (
                    <>
                      <Button onClick={startTrip} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all border-0 py-6" size="lg">
                        <div className="bg-white/20 rounded-full p-1.5 mr-3"><Play className="w-5 h-5" /></div><span className="font-bold text-base">Start Trip</span>
                      </Button>
                      <Button onClick={cancelAcceptedTrip} variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 py-5 hover:border-red-400" size="lg" disabled={isCancelling}>
                        <XCircle className="w-4 h-4 mr-2 opacity-80" />
                        {isCancelling ? (<div className="flex items-center gap-2"><div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full"></div><span>Cancelling...</span></div>) : 'Cancel Ride'}
                      </Button>
                    </>
                  )}
                  {activeRide.status === 'started' && (
                    <Button onClick={endTrip} className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-md hover:shadow-lg transition-all border-0 py-6" size="lg">
                      <div className="bg-white/20 rounded-full p-1.5 mr-3"><Square className="w-5 h-5" /></div><span className="font-bold text-base">End Trip</span>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Card><CardContent className="pt-6 pb-6"><p className="text-gray-500 text-center py-4">No active rides</p></CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader><CardTitle>Completed Rides</CardTitle></CardHeader>
              <CardContent>
                {isLoading && completedRides.length === 0 && currentView === 'history' ? (
                    <p className="text-gray-500 text-center py-4">Loading ride history...</p>
                ) : completedRides.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No completed rides yet</p>
                ) : (
                  <ScrollArea className="h-[400px] pr-3">
                    <div className="space-y-3">
                      {completedRides.map(ride => (
                        <div key={ride.id} className="border rounded-lg p-3.5 space-y-1.5 bg-white shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-blue-800">{ride.customerName || 'Customer'}</h3>
                              <p className="text-xs text-gray-500">
                                {new Date(ride.endTime || ride.requestTime || 0).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'})}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                                {formatPrice(ride.estimatedPrice || 0)}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-700 space-y-0.5">
                            <p className="flex items-center"><MapPin className="w-3.5 h-3.5 inline mr-1.5 text-blue-500 flex-shrink-0" />{ride.pickupLocationDescription || ride.pickupAddress || 'N/A'}</p>
                            <p className="flex items-center"><Route className="w-3.5 h-3.5 inline mr-1.5 text-blue-500 flex-shrink-0" />{ride.destinationDescription || ride.destinationAddress || 'N/A'}</p>
                            <p className="flex items-center text-indigo-600"><Navigation className="w-3.5 h-3.5 inline mr-1.5 text-indigo-400 flex-shrink-0" />Distance: {(ride.calculatedMileage || 0).toFixed(2)} miles</p>
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