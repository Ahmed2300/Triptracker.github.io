import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Clock, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DestinationInput from "./DestinationInput";
import { createRideRequest, listenToRideRequest, RideRequest, Location } from "@/services/firebaseService";
import { calculateEstimatedPrice, formatPrice } from "@/utils/priceCalculator";

interface CustomerInterfaceProps {
  onBack: () => void;
}

const CustomerInterface = ({ onBack }: CustomerInterfaceProps) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<{ location: Location; address: string } | null>(null);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
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
  }, [toast]);

  // Listen to active ride updates
  useEffect(() => {
    if (!currentRideId) return;

    const unsubscribe = listenToRideRequest(currentRideId, (ride) => {
      setActiveRide(ride);
      
      if (ride?.status === 'accepted') {
        toast({
          title: "Driver Found!",
          description: "Your driver is on the way.",
        });
      } else if (ride?.status === 'started') {
        toast({
          title: "Trip Started",
          description: "Your trip is now in progress.",
        });
      } else if (ride?.status === 'completed') {
        toast({
          title: "Trip Completed",
          description: `Total distance: ${ride.calculatedMileage.toFixed(2)} miles`,
        });
      }
    });

    return unsubscribe;
  }, [currentRideId, toast]);

  const requestRide = async () => {
    if (!currentLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location services to request a ride.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDestination) {
      toast({
        title: "Destination Required",
        description: "Please select a destination for your ride.",
        variant: "destructive",
      });
      return;
    }

    try {
      const customerId = `customer_${Date.now()}`; // In production, use proper user ID
      
      // Calculate estimated distance for pricing (simplified)
      const estimatedDistance = 5.0; // For demo, use 5 miles as estimate
      const estimatedPrice = calculateEstimatedPrice(estimatedDistance);
      
      const rideId = await createRideRequest({
        customerId,
        customerName: "Customer User",
        pickupLocation: currentLocation,
        pickupAddress: "Current Location",
        destinationLocation: selectedDestination.location,
        destinationAddress: selectedDestination.address,
        estimatedPrice,
      });

      if (rideId) {
        setCurrentRideId(rideId);
        toast({
          title: "Ride Requested",
          description: `Estimated cost: ${formatPrice(estimatedPrice)}. Looking for nearby drivers...`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request ride. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetRide = () => {
    setActiveRide(null);
    setCurrentRideId(null);
    setSelectedDestination(null);
  };

  const getStatusText = () => {
    if (!activeRide) return 'Ready to request a ride';
    
    switch (activeRide.status) {
      case 'pending':
        return 'Looking for driver...';
      case 'accepted':
        return 'Driver en route';
      case 'started':
        return 'Trip in progress';
      case 'completed':
        return 'Trip completed';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    if (!activeRide) return 'secondary';
    
    switch (activeRide.status) {
      case 'pending':
        return 'default';
      case 'accepted':
        return 'default';
      case 'started':
        return 'default';
      case 'completed':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Customer</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
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
              <CardTitle>Select Destination</CardTitle>
            </CardHeader>
            <CardContent>
              <DestinationInput
                onDestinationSelected={(location, address) => 
                  setSelectedDestination({ location, address })
                }
                selectedDestination={selectedDestination}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ride Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
            </div>

            {activeRide?.destinationAddress && (
              <div className="flex items-center justify-between">
                <span>Destination:</span>
                <span className="text-sm font-medium">{activeRide.destinationAddress}</span>
              </div>
            )}

            {activeRide?.estimatedPrice && (
              <div className="flex items-center justify-between">
                <span>Estimated Cost:</span>
                <span className="font-medium text-green-600">{formatPrice(activeRide.estimatedPrice)}</span>
              </div>
            )}

            {activeRide?.status === 'started' && (
              <>
                <div className="flex items-center justify-between">
                  <span>Distance:</span>
                  <span className="font-medium">{activeRide.calculatedMileage.toFixed(2)} miles</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current Cost:</span>
                  <span className="font-medium text-blue-600">
                    {formatPrice(calculateEstimatedPrice(activeRide.calculatedMileage))}
                  </span>
                </div>
              </>
            )}

            {activeRide?.status === 'completed' && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800">Trip Completed!</h3>
                <p className="text-green-600">Total distance: {activeRide.calculatedMileage.toFixed(2)} miles</p>
                <p className="text-green-600">Final cost: {formatPrice(calculateEstimatedPrice(activeRide.calculatedMileage))}</p>
                <p className="text-green-600">Destination: {activeRide.destinationAddress}</p>
              </div>
            )}

            <div className="pt-4">
              {!activeRide && (
                <Button 
                  onClick={requestRide} 
                  className="w-full" 
                  size="lg"
                  disabled={!currentLocation || !selectedDestination}
                >
                  <Car className="w-4 h-4 mr-2" />
                  Request Ride
                </Button>
              )}

              {activeRide?.status === 'pending' && (
                <Button disabled className="w-full" size="lg">
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Searching for Driver...
                </Button>
              )}

              {(activeRide?.status === 'accepted' || activeRide?.status === 'started') && (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 font-medium">Your ride is active</p>
                  <p className="text-blue-600 text-sm">Hang tight, you're on your way!</p>
                </div>
              )}

              {activeRide?.status === 'completed' && (
                <Button onClick={resetRide} className="w-full" size="lg">
                  Request Another Ride
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerInterface;
