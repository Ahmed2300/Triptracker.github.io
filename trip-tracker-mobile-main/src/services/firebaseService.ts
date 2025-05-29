import { database } from '@/lib/firebase';
import { ref, push, set, onValue, off, serverTimestamp, query, orderByChild, equalTo } from 'firebase/database';

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
}

export const createRideRequest = async (rideData: Omit<RideRequest, 'id' | 'requestTime' | 'calculatedMileage' | 'status'>) => {
  const ridesRef = ref(database, 'rideRequests');
  const newRideRef = push(ridesRef);
  
  const rideRequest: Omit<RideRequest, 'id'> = {
    ...rideData,
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
