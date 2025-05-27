import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Play, Square, Navigation, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { listenToPendingRides, updateRideRequest, RideRequest, Location } from "@/services/firebaseService";
import { calculateEstimatedPrice, formatPrice } from "@/utils/priceCalculator";

interface DriverInterfaceProps {
  onBack: () => void;
}

const DriverInterface = ({ onBack }: DriverInterfaceProps) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [pendingRides, setPendingRides] = useState<RideRequest[]>([]);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [mileage, setMileage] = useState(0);
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
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

    // Listen to pending rides
    const unsubscribe = listenToPendingRides((rides) => {
      setPendingRides(rides);
    });

    return unsubscribe;
  }, [toast]);

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

  const acceptRide = async (ride: RideRequest) => {
    if (!ride.id) return;

    const driverId = `driver_${Date.now()}`; // In production, use proper driver ID
    
    try {
      await updateRideRequest(ride.id, {
        ...ride,
        status: 'accepted',
        driverId,
        driverName: 'Driver User',
      });

      setActiveRide({ ...ride, status: 'accepted', driverId, driverName: 'Driver User' });
      toast({
        title: "Ride Accepted",
        description: `You've accepted ${ride.customerName || 'customer'}'s ride request.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept ride. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startTrip = async () => {
    if (!currentLocation || !activeRide?.id) {
      toast({
        title: "Location Required",
        description: "Please enable location services to start the trip.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateRideRequest(activeRide.id, {
        ...activeRide,
        status: 'started',
        startTime: Date.now(),
        startTripLocation: currentLocation,
      });

      setActiveRide({ ...activeRide, status: 'started' });
      setStartLocation(currentLocation);
      setMileage(0);
      setIsTracking(true);
      
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
    if (!activeRide?.id) return;

    try {
      await updateRideRequest(activeRide.id, {
        ...activeRide,
        status: 'completed',
        endTime: Date.now(),
        calculatedMileage: mileage,
      });

      setIsTracking(false);
      toast({
        title: "Trip Completed",
        description: `Final mileage: ${mileage.toFixed(2)} miles`,
      });

      // Reset after a moment
      setTimeout(() => {
        setActiveRide(null);
        setMileage(0);
        setStartLocation(null);
      }, 3000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end trip. Please try again.",
        variant: "destructive",
      });
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
              <CardTitle>Available Rides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingRides.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No ride requests available</p>
              ) : (
                pendingRides.map((ride) => (
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
                            Estimated: {formatPrice(ride.estimatedPrice)}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(ride.requestTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <Button onClick={() => acceptRide(ride)} className="w-full" size="sm">
                      Accept Ride
                    </Button>
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
