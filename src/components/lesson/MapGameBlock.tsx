import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { MapPin, Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapGameBlockProps {
  title?: string;
  instruction: string;
  map_config: {
    center: [number, number]; // [lng, lat]
    zoom: number;
    bounds?: [[number, number], [number, number]]; // [[sw_lng, sw_lat], [ne_lng, ne_lat]]
  };
  target: {
    name: string;
    latitude: number;
    longitude: number;
    tolerance_km: number;
  };
  feedback: {
    success: string;
    failure: string;
  };
  show_answer_on_fail?: boolean;
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapGameBlock({
  title,
  instruction,
  map_config,
  target,
  feedback,
  show_answer_on_fail = true
}: MapGameBlockProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const targetMarker = useRef<mapboxgl.Marker | null>(null);

  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = "pk.eyJ1Ijoid2luZW5vdGUiLCJhIjoiY21hcHV3bzJ6MDQ1eTJsc2gxNGFtMzA5ayJ9.oWl_sBJVu7u6CyLtWv-ZKw";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: map_config.center,
      zoom: map_config.zoom,
    });

    if (map_config.bounds) {
      map.current.setMaxBounds(map_config.bounds);
    }

    // Disable scroll zoom for better UX
    map.current.scrollZoom.disable();

    // Add click handler
    map.current.on("click", (e) => {
      if (isSubmitted) return;

      const { lat, lng } = e.lngLat;
      setUserPosition({ lat, lng });

      // Update or create marker
      if (userMarker.current) {
        userMarker.current.setLngLat([lng, lat]);
      } else {
        const el = document.createElement("div");
        el.className = "user-marker";
        el.innerHTML = `<div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>`;
        
        userMarker.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map.current!);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [map_config.center, map_config.zoom, map_config.bounds]);

  // Reset submitted state effect
  useEffect(() => {
    if (!isSubmitted && userMarker.current) {
      userMarker.current.remove();
      userMarker.current = null;
    }
    if (!isSubmitted && targetMarker.current) {
      targetMarker.current.remove();
      targetMarker.current = null;
    }
  }, [isSubmitted]);

  const handleSubmit = () => {
    if (!userPosition) return;

    const dist = calculateDistance(
      userPosition.lat,
      userPosition.lng,
      target.latitude,
      target.longitude
    );

    setDistance(Math.round(dist));
    setIsCorrect(dist <= target.tolerance_km);
    setIsSubmitted(true);

    // Show target marker if wrong and show_answer_on_fail is true
    if (dist > target.tolerance_km && show_answer_on_fail && map.current) {
      const el = document.createElement("div");
      el.className = "target-marker";
      el.innerHTML = `<div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </div>`;

      targetMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([target.longitude, target.latitude])
        .addTo(map.current);

      // Draw line between user position and target
      if (map.current.getSource("line")) {
        map.current.removeLayer("line");
        map.current.removeSource("line");
      }

      map.current.addSource("line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [userPosition.lng, userPosition.lat],
              [target.longitude, target.latitude]
            ]
          }
        }
      });

      map.current.addLayer({
        id: "line",
        type: "line",
        source: "line",
        paint: {
          "line-color": "#ef4444",
          "line-width": 2,
          "line-dasharray": [2, 2]
        }
      });

      // Fit bounds to show both markers
      const bounds = new mapboxgl.LngLatBounds()
        .extend([userPosition.lng, userPosition.lat])
        .extend([target.longitude, target.latitude]);

      map.current.fitBounds(bounds, { padding: 50 });
    }
  };

  const handleReset = () => {
    setUserPosition(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setDistance(null);

    if (map.current) {
      // Remove line if exists
      if (map.current.getLayer("line")) {
        map.current.removeLayer("line");
      }
      if (map.current.getSource("line")) {
        map.current.removeSource("line");
      }

      // Reset view
      map.current.flyTo({
        center: map_config.center,
        zoom: map_config.zoom
      });
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-2xl p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
      {title && <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>}
      
      <div className="flex items-start gap-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">{instruction}</p>
      </div>

      {/* Map */}
      <div 
        ref={mapContainer} 
        className="w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-border mb-4"
      />

      {/* Action area */}
      {!isSubmitted ? (
        <div className="space-y-3">
          {userPosition && (
            <p className="text-sm text-center text-muted-foreground">
              Position sélectionnée ✓
            </p>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={!userPosition}
            className="w-full"
          >
            Valider ma réponse
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Result */}
          <div className={cn(
            "p-4 rounded-xl border",
            isCorrect 
              ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" 
              : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    Correct ! ({distance} km de la cible)
                  </span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-700 dark:text-red-400">
                    À {distance} km de {target.name}
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isCorrect ? feedback.success : feedback.failure}
            </p>
          </div>

          <Button onClick={handleReset} variant="outline" className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      )}
    </div>
  );
}
