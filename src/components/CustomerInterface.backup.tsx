import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Clock, Car, DollarSign, X, AlertCircle, History, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DestinationInput from "./DestinationInput";
import { createRideRequest, listenToRideRequest, cancelRideRequest, RideRequest, Location, checkCustomerHasActiveRide, listenToUserRides } from "@/services/firebaseService";
import { formatPrice } from "@/utils/priceCalculator";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

interface CustomerInterfaceProps {
  onBack: () => void;
}

const CustomerInterface = ({ onBack }: CustomerInterfaceProps) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<{ location: Location; address: string } | null>(null);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [manualPrice, setManualPrice] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRides, setUserRides] = useState<RideRequest[]>([]);
  const [showPastRides, setShowPastRides] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // Effect to check for any active rides when the component mounts
  useEffect(() => {
    const checkForActiveRides = async () => {
      try {
        const existingRide = await checkCustomerHasActiveRide();
        if (existingRide) {
          // Focus on active ride by setting states
          setActiveRide(existingRide);
          setCurrentRideId(existingRide.id);
          
          // If ride is in progress, automatically update UI to focus on the trip
          if (existingRide.status === 'accepted' || existingRide.status === 'started') {
            // Clear destination selection if there's an active ride
            setSelectedDestination(null);
            
            // Show toast notification with trip status
            const statusText = existingRide.status === 'accepted' ? 'Driver is on the way' : 'Trip in progress';
            toast({
              title: "Active Trip Found",
              description: statusText,
              variant: "default",
            });
            
            // If the ride has driver info, show additional notification
            if (existingRide.driverName) {
              setTimeout(() => {
                toast({
                  title: "Driver Information",
                  description: `Your driver is ${existingRide.driverName}`,
                  variant: "default",
                });
              }, 1500);
            }
          } else {
            // For pending rides, just show basic notification
            toast({
              title: "Active Ride Found",
              description: "You have an ongoing ride request.",
            });
          }
        }
      } catch (error) {
        console.error("Error checking for active rides:", error);
      }
    };
    
    if (currentUser) {
      checkForActiveRides();
    }
  }, [currentUser, toast]);

  // Effect to listen to all user rides (active and past)
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = listenToUserRides((rides) => {
      setUserRides(rides);
    });
    
    return unsubscribe;
  }, [currentUser]);

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
      } else if (ride?.status === 'cancelled') {
        toast({
          title: "Ride Cancelled",
          description: "Your ride request has been cancelled.",
        });
      }
    });

    return unsubscribe;
  }, [currentRideId, toast]);

  const requestRide = async () => {
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    // Check if user already has an active ride
    const existingRide = await checkCustomerHasActiveRide();
    if (existingRide) {
      toast({
        title: "Active Ride Exists",
        description: "You already have an active ride request. Please complete or cancel it before requesting a new one.",
        variant: "destructive",
      });
      setActiveRide(existingRide);
      setCurrentRideId(existingRide.id);
      return;
    }

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

    if (!manualPrice || isNaN(parseFloat(manualPrice)) || parseFloat(manualPrice) <= 0) {
      toast({
        title: "Price Required",
        description: "Please enter a valid price for your trip.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // The createRideRequest function now automatically uses the current user's ID and name
      const customerPrice = parseFloat(manualPrice);
      
      const rideId = await createRideRequest({
        pickupLocation: currentLocation,
        pickupAddress: "Current Location",
        destinationLocation: selectedDestination.location,
        destinationAddress: selectedDestination.address,
        estimatedPrice: customerPrice,
      });

      if (rideId) {
        setCurrentRideId(rideId);
        toast({
          title: "Ride Requested",
          description: `Your offered price: ${formatPrice(customerPrice)}. Looking for nearby drivers...`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request ride. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetRide = () => {
    setActiveRide(null);
    setCurrentRideId(null);
    setSelectedDestination(null);
    setManualPrice("");
  };

  // Function to cancel a ride request
  const handleCancelRide = async () => {
    if (!activeRide?.id || activeRide.status !== 'pending') return;
    
    setIsCancelling(true);
    try {
      const result = await cancelRideRequest(activeRide.id);
      
      if (result.success) {
        toast({
          title: "Ride Cancelled",
          description: "Your ride request has been cancelled.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel ride request.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
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
      case 'cancelled':
        return 'Ride cancelled';
      default:
        return '';
    }
  };

  const getStatusColor = (status?: string) => {
    // If no status is provided, use the active ride's status
    const rideStatus = status || activeRide?.status;
    
    if (!rideStatus) return 'secondary';
    
    switch (rideStatus) {
      case 'pending':
        return 'default';
      case 'accepted':
        return 'default';
      case 'started':
        return 'default';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
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

        {/* Only show destination selection when there's no active ride */}
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

              {selectedDestination && (
                <div className="space-y-4 mt-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Enter your price ($)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                      </div>
                      <Input
                        id="price"
                        type="number"
                        placeholder="Enter your offer"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        className="pl-9"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={requestRide}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Requesting..." : "Request Ride"}
                  </Button>
                </div>
              )}
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
                    {formatPrice(activeRide.estimatedPrice)}
                  </span>
                </div>
              </>
            )}

            {activeRide?.status === 'completed' && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800">Trip Completed!</h3>
                <p className="text-green-600">Total distance: {activeRide.calculatedMileage.toFixed(2)} miles</p>
                <p className="text-green-600">Final cost: {formatPrice(activeRide.estimatedPrice)}</p>
                <p className="text-green-600">Destination: {activeRide.destinationAddress}</p>
              </div>
            )}

            {activeRide?.status === 'cancelled' && (
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-800 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Ride Cancelled
                </h3>
                <p className="text-red-600 text-sm mt-1">This ride request has been cancelled.</p>
                <Button onClick={resetRide} className="w-full mt-3" variant="outline" size="sm">
                  Request a New Ride
                </Button>
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
                <div className="space-y-2">
                  <div className="flex items-center justify-center p-2 bg-yellow-50 rounded text-yellow-700 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Searching for a driver...</span>
                  </div>
                  <Button 
                    onClick={handleCancelRide} 
                    variant="destructive" 
                    className="w-full" 
                    size="lg"
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-white rounded-full border-t-transparent"></div>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancel Ride Request
                      </>
                    )}
                  </Button>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Your Ride Requests
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2" 
                onClick={() => setShowPastRides(!showPastRides)}
              >
                {showPastRides ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showPastRides && (
            <CardContent>
              {userRides.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No ride history found</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {userRides
                    .sort((a, b) => b.requestTime - a.requestTime) // Sort by most recent first
                    .map(ride => (
                      <div 
                        key={ride.id} 
                        className={`border rounded-lg p-3 ${ride.status === 'pending' || ride.status === 'accepted' || ride.status === 'started' ? 'border-blue-200 bg-blue-50' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(ride.requestTime).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-600">
                              {ride.destinationAddress}
                            </p>
                          </div>
                          <Badge variant={getStatusColor(ride.status)}>
                            {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span>Price:</span>
                            <span className="font-medium">{formatPrice(ride.estimatedPrice || 0)}</span>
                          </div>
                          {ride.calculatedMileage > 0 && (
                            <div className="flex justify-between">
                              <span>Distance:</span>
                              <span>{ride.calculatedMileage.toFixed(2)} miles</span>
                            </div>
                          )}
                          {ride.status === 'pending' && currentRideId !== ride.id && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full mt-2"
                              onClick={() => {
                                setCurrentRideId(ride.id);
                                setActiveRide(ride);
                              }}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CustomerInterface;
