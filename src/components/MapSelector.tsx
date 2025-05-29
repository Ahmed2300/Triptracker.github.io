import { useEffect, useState, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Location } from "@/services/firebaseService";
import type { LatLngTuple, Map as LeafletMap } from "leaflet";
import L from "leaflet";

// Fix the Leaflet icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Create a custom marker icon
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapSelectorProps {
  initialLocation: Location;
  initialAddress: string;
  onConfirm: (location: Location, address: string) => void;
  onCancel: () => void;
}

const MapSelector = ({ 
  initialLocation, 
  initialAddress, 
  onConfirm, 
  onCancel 
}: MapSelectorProps) => {
  const [markerPosition, setMarkerPosition] = useState<LatLngTuple>([
    initialLocation.latitude,
    initialLocation.longitude
  ]);
  const [address, setAddress] = useState(initialAddress);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Reverse geocoding to get address from coordinates
  const fetchAddressForCoordinates = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TripTracker-App/1.0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          setAddress(data.display_name);
        }
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePositionChange = (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    fetchAddressForCoordinates(lat, lng);
  };

  const handleConfirm = () => {
    onConfirm(
      { latitude: markerPosition[0], longitude: markerPosition[1] },
      address
    );
  };

  // Effect to initialize the map once when the component mounts
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      const map = L.map(mapRef.current).setView([markerPosition[0], markerPosition[1]], 15);
      leafletMapRef.current = map;
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Add marker
      const marker = L.marker([markerPosition[0], markerPosition[1]], {
        draggable: true
      }).addTo(map);
      markerRef.current = marker;
      
      // Handle marker drag
      marker.on('dragend', function() {
        const position = marker.getLatLng();
        handlePositionChange(position.lat, position.lng);
      });
      
      // Handle map click
      map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        handlePositionChange(e.latlng.lat, e.latlng.lng);
      });
    }
    // Only run this effect once on mount
  }, []);

  // Effect to update marker position when markerPosition state changes
  useEffect(() => {
    if (markerRef.current && leafletMapRef.current) {
      // Update marker position
      markerRef.current.setLatLng([markerPosition[0], markerPosition[1]]);
      
      // Center map on the new position
      leafletMapRef.current.setView([markerPosition[0], markerPosition[1]], leafletMapRef.current.getZoom());
    }
  }, [markerPosition]);

  // Cleanup effect to remove the map when component unmounts
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }
    };
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Adjust Destination Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          id="map" 
          className="h-[300px] w-full mb-4 rounded-md overflow-hidden border"
          ref={mapRef}
        ></div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Location:</p>
          <p className="text-sm text-gray-600 break-words">
            {isLoading ? "Loading address..." : address}
          </p>
          <p className="text-xs text-gray-500">
            Lat: {markerPosition[0].toFixed(6)}, Lng: {markerPosition[1].toFixed(6)}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm}>
          Confirm Location
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MapSelector;
