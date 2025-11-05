import { useState, useEffect, useRef } from "react";
import { Input } from "./ui/input";
import { MapPin } from "lucide-react";

interface AddressFeature {
  properties: {
    label: string;
    city: string;
    postcode: string;
    context: string;
  };
  geometry: {
    coordinates: [number, number]; // [longitude, latitude]
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates?: { latitude: number; longitude: number }) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = "Adresse",
  disabled = false,
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  // Fermer les suggestions quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Rechercher les adresses
  useEffect(() => {
    const searchAddress = async () => {
      // Ne pas rechercher si on vient de sélectionner une adresse
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }

      if (value.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`
        );
        const data = await response.json();
        setSuggestions(data.features || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Erreur lors de la recherche d'adresse:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchAddress, 300);
    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleSelectAddress = (feature: AddressFeature) => {
    const address = feature.properties.label;
    const [longitude, latitude] = feature.geometry.coordinates;
    
    justSelectedRef.current = true;
    onChange(address, { latitude, longitude });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((feature, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-start gap-2"
              onClick={() => handleSelectAddress(feature)}
            >
              <MapPin className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {feature.properties.label}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {feature.properties.context}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
