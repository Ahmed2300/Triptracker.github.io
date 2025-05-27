import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Location } from "@/services/firebaseService";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

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

L.Marker.prototype.options.icon = DefaultIcon;

interface RideRouteMapProps {
  pickupLocation: Location;
  destinationLocation: Location;
  onDistanceCalculated?: (distance: number) => void;
}

const RideRouteMap = ({ 
  pickupLocation, 
  destinationLocation,
  onDistanceCalculated
}: RideRouteMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

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

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Calculate bounds to fit both points
    const pickupLatLng = L.latLng(pickupLocation.latitude, pickupLocation.longitude);
    const destinationLatLng = L.latLng(destinationLocation.latitude, destinationLocation.longitude);
    const bounds = L.latLngBounds([pickupLatLng, destinationLatLng]);
    
    // Initialize map
    const map = L.map(mapRef.current, {
      center: bounds.getCenter(),
      zoom: 13
    });
    mapInstanceRef.current = map;
    
    // Add padding to bounds to make sure markers are visible
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add pickup marker
    const pickupMarker = L.marker([pickupLocation.latitude, pickupLocation.longitude], {
      title: 'Pickup Location'
    }).addTo(map);
    pickupMarker.bindPopup('Pickup Location').openPopup();
    
    // Add destination marker
    const destinationMarker = L.marker([destinationLocation.latitude, destinationLocation.longitude], {
      icon: DestinationIcon,
      title: 'Destination'
    }).addTo(map);
    destinationMarker.bindPopup('Destination');
    
    // Create a polyline to show the route
    const polyline = L.polyline([
      [pickupLocation.latitude, pickupLocation.longitude],
      [destinationLocation.latitude, destinationLocation.longitude]
    ], {
      color: 'blue',
      weight: 4,
      opacity: 0.7,
      lineJoin: 'round'
    }).addTo(map);

    // Calculate and display distance
    const distance = calculateDistance(pickupLocation, destinationLocation);
    
    // Add distance label on the route
    const midpoint = L.latLng(
      (pickupLocation.latitude + destinationLocation.latitude) / 2,
      (pickupLocation.longitude + destinationLocation.longitude) / 2
    );
    
    L.marker(midpoint, {
      icon: L.divIcon({
        className: 'distance-label',
        html: `<div class="bg-white px-2 py-1 rounded shadow text-xs">${distance.toFixed(1)} miles</div>`,
        iconSize: [80, 20],
        iconAnchor: [40, 10]
      })
    }).addTo(map);
    
    // Call the callback with the calculated distance
    if (onDistanceCalculated) {
      onDistanceCalculated(distance);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pickupLocation, destinationLocation, onDistanceCalculated]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div 
          ref={mapRef}
          className="h-[250px] w-full"
        />
      </CardContent>
    </Card>
  );
};

export default RideRouteMap;
