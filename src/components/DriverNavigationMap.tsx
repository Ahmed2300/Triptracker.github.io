import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Location } from "@/services/firebaseService";
import { Map as LucideMap, MapPin, Navigation, ArrowRight } from "lucide-react";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Badge } from "./ui/badge";

// Create a custom marker icon
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Create a different icon for destination
const DestinationIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'destination-marker' // Will add a CSS class for styling
});

// Create a different icon for driver
const DriverIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'driver-marker' // CSS class for styling
});

L.Marker.prototype.options.icon = DefaultIcon;

interface DriverNavigationMapProps {
  currentLocation: Location;
  pickupLocation?: Location;
  destinationLocation?: Location;
  tripStatus: 'accepted' | 'started' | 'completed';
  onDistanceCalculated?: (distance: number) => void;
}

const DriverNavigationMap = ({ 
  currentLocation,
  pickupLocation,
  destinationLocation,
  tripStatus,
  onDistanceCalculated
}: DriverNavigationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const [distance, setDistance] = useState<number>(0);

  // Calculate distance between two points using the Haversine formula
  const calculateDistance = (start: Location, end: Location): number => {
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

  // Setup the map when component mounts
  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [currentLocation.latitude, currentLocation.longitude],
        zoom: 15
      });
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      mapInstanceRef.current = map;
      
      // Create a layer group for routes that we can update
      const routeLayer = L.layerGroup().addTo(map);
      routeLayerRef.current = routeLayer;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        routeLayerRef.current = null;
      }
    };
  }, []);

  // Update the route based on current location and status
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    
    if (!map || !routeLayer) return;
    
    // Clear previous routes and markers
    routeLayer.clearLayers();
    
    // Add driver marker
    const driverMarker = L.marker(
      [currentLocation.latitude, currentLocation.longitude], 
      { icon: DriverIcon, title: 'Your Location' }
    ).addTo(routeLayer);
    driverMarker.bindPopup('Your Location').openPopup();
    
    // Determine the target location based on trip status
    let targetLocation: Location | undefined;
    let targetName = '';
    let routeColor = '';
    
    if (tripStatus === 'accepted' && pickupLocation) {
      targetLocation = pickupLocation;
      targetName = 'Pickup Location';
      routeColor = '#3b82f6'; // blue-500
    } else if (tripStatus === 'started' && destinationLocation) {
      targetLocation = destinationLocation;
      targetName = 'Destination';
      routeColor = '#10b981'; // emerald-500
    }
    
    if (targetLocation) {
      // Add target marker
      const targetMarker = L.marker(
        [targetLocation.latitude, targetLocation.longitude],
        { 
          icon: tripStatus === 'accepted' ? DefaultIcon : DestinationIcon,
          title: targetName
        }
      ).addTo(routeLayer);
      targetMarker.bindPopup(targetName);
      
      // Create a polyline to show the route
      const polyline = L.polyline([
        [currentLocation.latitude, currentLocation.longitude],
        [targetLocation.latitude, targetLocation.longitude]
      ], {
        color: routeColor,
        weight: 4,
        opacity: 0.7,
        lineJoin: 'round',
        dashArray: tripStatus === 'accepted' ? '5, 10' : undefined // dashed line for pickup route
      }).addTo(routeLayer);
      
      // Calculate distance
      const calculatedDistance = calculateDistance(currentLocation, targetLocation);
      setDistance(calculatedDistance);
      
      if (onDistanceCalculated) {
        onDistanceCalculated(calculatedDistance);
      }
      
      // Fit bounds to show both points
      const bounds = L.latLngBounds(
        [currentLocation.latitude, currentLocation.longitude],
        [targetLocation.latitude, targetLocation.longitude]
      );
      
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15
      });
    } else {
      // If no target, just center on driver
      map.setView([currentLocation.latitude, currentLocation.longitude], 15);
    }
  }, [currentLocation, pickupLocation, destinationLocation, tripStatus, onDistanceCalculated]);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-md flex items-center gap-2">
            <LucideMap className="w-4 h-4" />
            {tripStatus === 'accepted' ? 'Navigation to Pickup' : 'Navigation to Destination'}
          </CardTitle>
          <Badge variant={tripStatus === 'accepted' ? 'secondary' : 'default'}>
            {distance.toFixed(1)} miles
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapRef} className="h-[250px] w-full" />
        <div className="p-3 bg-gray-50 border-t text-sm">
          <div className="flex items-center gap-2">
            {tripStatus === 'accepted' ? (
              <>
                <Navigation className="w-4 h-4 text-blue-500" />
                <span>Navigate to pickup location</span>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span>Navigate to customer destination</span>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverNavigationMap;
