import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Search, Loader2, MapIcon } from "lucide-react";
import { Location } from "@/services/firebaseService";
import MapSelector from "./MapSelector";

interface DestinationInputProps {
  onDestinationSelected: (location: Location, address: string) => void;
  selectedDestination?: { location: Location; address: string };
}

const DestinationInput = ({ onDestinationSelected, selectedDestination }: DestinationInputProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ address: string; location: Location }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [tempDestination, setTempDestination] = useState<{ location: Location; address: string } | null>(null);

  // Use OpenStreetMap's Nominatim API for geocoding
  const searchDestination = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    
    setIsSearching(true);
    setError(null);
    setSuggestions([]);
    
    try {
      // Using Nominatim API with format=json and limit=5
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
            // Add a unique user agent as requested by Nominatim's usage policy
            'User-Agent': 'TripTracker-App/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && Array.isArray(data) && data.length > 0) {
        // Transform Nominatim results to our format
        const formattedResults = data.map(item => ({
          address: item.display_name,
          location: {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon)
          }
        }));
        
        setSuggestions(formattedResults);
      } else {
        setError("No locations found. Please try a different search term.");
      }
    } catch (err) {
      console.error("Location search error:", err);
      setError("Failed to search for locations. Please try again later.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectDestination = (destination: { address: string; location: Location }) => {
    // Instead of immediately finalizing the selection, set it as temporary and show the map
    setTempDestination(destination);
    setShowMap(true);
    setSuggestions([]);
  };

  const handleMapConfirm = (location: Location, address: string) => {
    // When the user confirms on the map, finalize the selection
    onDestinationSelected(location, address);
    setShowMap(false);
    setTempDestination(null);
    setSearchQuery("");
  };

  const handleMapCancel = () => {
    setShowMap(false);
    setTempDestination(null);
  };

  return (
    <div className="space-y-2">
      {showMap && tempDestination ? (
        <MapSelector
          initialLocation={tempDestination.location}
          initialAddress={tempDestination.address}
          onConfirm={handleMapConfirm}
          onCancel={handleMapCancel}
        />
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              placeholder="Where would you like to go?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchDestination()}
              disabled={isSearching}
            />
            <Button onClick={searchDestination} size="icon" disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {selectedDestination && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-green-800 block">
                      Destination: {selectedDestination.address}
                    </span>
                    <div className="flex justify-end mt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs"
                        onClick={() => {
                          setTempDestination(selectedDestination);
                          setShowMap(true);
                        }}
                      >
                        <MapIcon className="w-3 h-3 mr-1" />
                        Adjust on Map
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!showMap && suggestions.length > 0 && (
            <Card>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start h-auto p-2 text-left"
                      onClick={() => selectDestination(suggestion)}
                    >
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" />
                      <span className="text-sm truncate">{suggestion.address}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!showMap && error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3">
                <p className="text-sm text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DestinationInput;
