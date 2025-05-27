import { database, auth } from '@/lib/firebase';
import { ref, push, set, onValue, off, serverTimestamp, query, orderByChild, equalTo, remove, update, get } from 'firebase/database';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RideRequest {
  id?: string;
  customerId: string;
  customerName?: string;
  requestTime: number;
  pickupLocation: Location;
  pickupAddress?: string;
  destinationLocation?: Location;
  destinationAddress?: string;
  status: 'pending' | 'accepted' | 'started' | 'completed' | 'cancelled';
  driverId?: string;
  driverName?: string;
  startTime?: number;
  endTime?: number;
  startTripLocation?: Location;
  currentDriverLocation?: Location;
  calculatedMileage: number;
  estimatedPrice?: number;
  cancelTime?: number;
  acceptTime?: number;
  driverCancelTime?: number;
  estimatedTimeToPickup?: number; // in minutes
  estimatedDistanceToPickup?: number; // in miles
  lastDriverLocationUpdateTime?: number; // timestamp of last location update
}

export const createRideRequest = async (rideData: Omit<RideRequest, 'id' | 'requestTime' | 'calculatedMileage' | 'status' | 'customerId' | 'customerName'>) => {
  // Check if user is authenticated
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to create a ride request');
  }
  
  const ridesRef = ref(database, 'rideRequests');
  const newRideRef = push(ridesRef);
  
  const rideRequest: Omit<RideRequest, 'id'> = {
    ...rideData,
    // Use the authenticated user's ID and display name
    customerId: currentUser.uid,
    customerName: currentUser.displayName || 'Anonymous User',
    requestTime: Date.now(),
    status: 'pending',
    calculatedMileage: 0
  };
  
  await set(newRideRef, rideRequest);
  return newRideRef.key;
};

export const updateRideRequest = async (rideId: string, updates: Partial<RideRequest>) => {
  const rideRef = ref(database, `rideRequests/${rideId}`);
  await set(rideRef, updates);
};

// Cancel a ride request (for customers)
export const cancelRideRequest = async (rideId: string) => {
  // Check if user is authenticated
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to cancel a ride request');
  }
  
  // Get the ride details first to verify ownership
  const rideRef = ref(database, `rideRequests/${rideId}`);
  const snapshot = await new Promise<any>((resolve, reject) => {
    onValue(rideRef, resolve, { onlyOnce: true });
  });
  
  const rideData = snapshot.val();
  
  // Verify the user owns this ride request
  if (!rideData) {
    throw new Error('Ride request not found');
  }
  
  if (rideData.customerId !== currentUser.uid) {
    throw new Error('You can only cancel your own ride requests');
  }
  
  // Only allow cancellation if the ride is still pending
  if (rideData.status !== 'pending') {
    throw new Error(`Cannot cancel a ride that is already ${rideData.status}`);
  }
  
  // Update the ride status to cancelled
  await update(rideRef, {
    status: 'cancelled',
    cancelTime: Date.now()
  });
  
  return { success: true };
};

export const listenToRideRequest = (rideId: string, callback: (ride: RideRequest | null) => void) => {
  const rideRef = ref(database, `rideRequests/${rideId}`);
  const unsubscribe = onValue(rideRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback({ ...data, id: rideId });
    } else {
      callback(null);
    }
  });
  
  return () => off(rideRef, 'value', unsubscribe);
};

export const listenToPendingRides = (callback: (rides: RideRequest[]) => void) => {
  const ridesRef = ref(database, 'rideRequests');
  const pendingQuery = query(ridesRef, orderByChild('status'), equalTo('pending'));
  
  const unsubscribe = onValue(pendingQuery, (snapshot) => {
    const rides: RideRequest[] = [];
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      rides.push({ ...data, id: childSnapshot.key });
    });
    callback(rides);
  });
  
  return () => off(pendingQuery, 'value', unsubscribe);
};

// Listen to rides for the current user
export const listenToUserRides = (callback: (rides: RideRequest[]) => void) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('Must be signed in to listen to user rides');
    callback([]);
    return () => {};
  }
  
  const ridesRef = ref(database, 'rideRequests');
  const userRidesQuery = query(ridesRef, orderByChild('customerId'), equalTo(currentUser.uid));
  
  const unsubscribe = onValue(userRidesQuery, (snapshot) => {
    const rides: RideRequest[] = [];
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      rides.push({ ...data, id: childSnapshot.key });
    });
    callback(rides);
  });
  
  return () => off(userRidesQuery, 'value', unsubscribe);
};

// Check if customer has any active/pending ride requests
export const checkCustomerHasActiveRide = async (): Promise<RideRequest | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('User not signed in when checking for customer active rides');
      return null;
    }

    // Make sure we have a valid database reference
    if (!database) {
      console.error('Firebase database not initialized');
      return null;
    }

    const ridesRef = ref(database, 'rideRequests');
    const activeRidesQuery = query(
      ridesRef, 
      orderByChild('customerId'), 
      equalTo(currentUser.uid)
    );

    const snapshot = await get(activeRidesQuery);
    let activeRide: RideRequest | null = null;

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const ride = childSnapshot.val();
        if (ride) {
          ride.id = childSnapshot.key;
          
          // Check if the ride is active (pending, accepted, or started)
          if (ride.status === 'pending' || ride.status === 'accepted' || ride.status === 'started') {
            activeRide = ride;
            // Stop forEach loop once we find an active ride
            return true;
          }
        }
      });
    }

    return activeRide;
  } catch (error) {
    // More detailed error logging
    console.error('Error checking for customer active rides:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
};

// Check if driver has any active rides (accepted or started)
export const checkDriverHasActiveRide = async (): Promise<RideRequest | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('User not signed in when checking for driver active rides');
      return null;
    }
    
    // Make sure we have a valid database reference
    if (!database) {
      console.error('Firebase database not initialized');
      return null;
    }
    
    const ridesRef = ref(database, 'rideRequests');
    
    // First check for 'accepted' rides
    const acceptedRidesQuery = query(
      ridesRef, 
      orderByChild('driverId'), 
      equalTo(currentUser.uid)
    );
    
    const snapshot = await get(acceptedRidesQuery);
    let activeRide: RideRequest | null = null;
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        // Only consider rides that are accepted or started
        if (data && (data.status === 'accepted' || data.status === 'started')) {
          activeRide = { ...data, id: childSnapshot.key };
          return true; // Break the forEach loop
        }
      });
    }
    
    return activeRide;
  } catch (error) {
    // More detailed error logging
    console.error('Error in checkDriverHasActiveRide:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null; // Return null instead of propagating the error
  }
};

// Listen to the driver's current active ride
export const listenToDriverActiveRide = (callback: (ride: RideRequest | null) => void) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('Must be signed in to listen to active ride');
    callback(null);
    return () => {};
  }
  
  const ridesRef = ref(database, 'rideRequests');
  const driverRidesQuery = query(ridesRef, orderByChild('driverId'), equalTo(currentUser.uid));
  
  const unsubscribe = onValue(driverRidesQuery, (snapshot) => {
    let activeRide: RideRequest | null = null;
    
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      // Only consider rides that are accepted or started
      if (data.status === 'accepted' || data.status === 'started') {
        activeRide = { ...data, id: childSnapshot.key };
        return true; // Break the forEach loop
      }
    });
    
    callback(activeRide);
  });
  
  return () => off(driverRidesQuery, 'value', unsubscribe);
};

// Listen to driver's completed rides history
export const listenToDriverCompletedRides = (callback: (rides: RideRequest[]) => void) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('Must be signed in to view ride history');
    callback([]);
    return () => {};
  }
  
  const ridesRef = ref(database, 'rideRequests');
  const driverRidesQuery = query(ridesRef, orderByChild('driverId'), equalTo(currentUser.uid));
  
  const unsubscribe = onValue(driverRidesQuery, (snapshot) => {
    const completedRides: RideRequest[] = [];
    
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      // Only include completed rides
      if (data.status === 'completed') {
        completedRides.push({ ...data, id: childSnapshot.key });
      }
    });
    
    // Sort by completion time (latest first)
    completedRides.sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
    
    callback(completedRides);
  });
  
  return () => off(driverRidesQuery, 'value', unsubscribe);
};

// Update driver location and calculate ETA to pickup
export const updateDriverLocation = async (rideId: string, driverLocation: Location) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to update your location');
  }

  try {
    // Get the ride request to access pickup location
    const rideRef = ref(database, `rideRequests/${rideId}`);
    const rideSnapshot = await get(rideRef);
    
    if (!rideSnapshot.exists()) {
      throw new Error('Ride not found');
    }
    
    const ride = rideSnapshot.val();
    
    // Make sure this is the assigned driver
    if (ride.driverId !== currentUser.uid) {
      throw new Error('Only the assigned driver can update their location');
    }
    
    // Only calculate ETA if the ride is accepted but not started yet
    if (ride.status === 'accepted' && ride.pickupLocation) {
      // Import distance calculation utilities
      const { calculateDistance, calculateEstimatedTime } = await import('@/utils/distanceCalculator');
      
      // Calculate distance to pickup
      const distanceToPickup = calculateDistance(driverLocation, ride.pickupLocation);
      
      // Calculate estimated time to pickup (using average urban speed of 25mph)
      const timeToPickup = calculateEstimatedTime(distanceToPickup);
      
      // Update the ride with driver location and ETA information
      await update(rideRef, {
        currentDriverLocation: driverLocation,
        estimatedDistanceToPickup: distanceToPickup,
        estimatedTimeToPickup: timeToPickup,
        lastDriverLocationUpdateTime: Date.now()
      });
      
      return {
        success: true,
        distanceToPickup,
        timeToPickup
      };
    } else {
      // Just update location if ride is already started
      await update(rideRef, {
        currentDriverLocation: driverLocation,
        lastDriverLocationUpdateTime: Date.now()
      });
      
      return { success: true };
    }
  } catch (error: any) {
    console.error('Error updating driver location:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Cancel an accepted ride (for drivers)
export const cancelAcceptedRide = async (rideId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to cancel a ride');
  }
  
  // Get the ride details first to verify ownership
  const rideRef = ref(database, `rideRequests/${rideId}`);
  const snapshot = await get(rideRef);
  const rideData = snapshot.val();
  
  // Verify the driver owns this ride
  if (!rideData) {
    throw new Error('Ride not found');
  }
  
  if (rideData.driverId !== currentUser.uid) {
    throw new Error('You can only cancel rides you have accepted');
  }
  
  // Only allow cancellation if the ride is still in accepted state (not started)
  if (rideData.status !== 'accepted') {
    throw new Error(`Cannot cancel a ride that is already ${rideData.status}`);
  }
  
  // Return the ride to pending status and remove driver information
  await update(rideRef, {
    status: 'pending',
    driverId: null,
    driverName: null,
    driverCancelTime: Date.now()
  });
  
  return { success: true };
};
