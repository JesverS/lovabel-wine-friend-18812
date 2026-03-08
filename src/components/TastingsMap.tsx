import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Récupérer le token Mapbox depuis les variables d'environnement
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

interface TastingsMapProps {
  sourceFilter?: string | null;
  userId?: string;
}

interface TastingLocation {
  id: string;
  wine_id: string;
  wine_name: string;
  wine_year: number;
  domain_name: string;
  created_at: string;
  latitude: number;
  longitude: number;
  source_type: string;
  source_name: string;
  source_id: string | null;
  liked: number;
}

const SOURCE_COLORS = {
  event: "#3b82f6", // Bleu
  cellar: "#a855f7", // Violet
  spontaneous: "#ef4444", // Rouge
};

export default function TastingsMap({ sourceFilter, userId }: TastingsMapProps) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tastings, setTastings] = useState<TastingLocation[]>([]);

  useEffect(() => {
    if (!targetUserId) return;

    const fetchTastings = async () => {
      try {
        const { data, error } = await supabase.rpc("get_user_tastings_with_location", {
          p_user_id: targetUserId,
          p_source_filter: sourceFilter,
        });

        if (error) throw error;

        setTastings(data || []);
      } catch (error) {
        console.error("Error fetching tastings:", error);
        toast.error("Erreur lors du chargement des dégustations");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTastings();
  }, [targetUserId, sourceFilter]);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || tastings.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Initialiser la carte
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [2.3522, 48.8566], // Paris par défaut
      zoom: 5,
    });

    // Ajouter les contrôles de navigation
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      if (!map.current) return;

      // Créer le GeoJSON pour les points
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: tastings.map((tasting) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [tasting.longitude, tasting.latitude],
          },
          properties: {
            id: tasting.id,
            wine_name: tasting.wine_name,
            wine_year: tasting.wine_year,
            domain_name: tasting.domain_name,
            source_type: tasting.source_type,
            source_name: tasting.source_name,
            created_at: new Date(tasting.created_at).toLocaleDateString("fr-FR"),
            color: SOURCE_COLORS[tasting.source_type],
            liked: tasting.liked,
          },
        })),
      };

      // Ajouter la source
      map.current!.addSource("tastings", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Layer pour les clusters
      map.current!.addLayer({
        id: "clusters",
        type: "circle",
        source: "tastings",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#51bbd6", 10, "#f1f075", 30, "#f28cb1"],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 30, 30, 40],
        },
      });

      // Layer pour le nombre dans les clusters
      map.current!.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "tastings",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Layer pour les points individuels
      map.current!.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "tastings",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Clic sur un cluster pour zoomer
      map.current!.on("click", "clusters", (e) => {
        if (!map.current) return;
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current.getSource("tastings") as mapboxgl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return;
          const coordinates = (features[0].geometry as GeoJSON.Point).coordinates;
          map.current.easeTo({
            center: [coordinates[0], coordinates[1]],
            zoom: zoom,
          });
        });
      });

      // Popup sur les points individuels
      map.current!.on("click", "unclustered-point", (e) => {
        if (!e.features || !e.features[0]) return;

        const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice();
        const props = e.features[0].properties;

        const likedEmoji = props.liked === 1 ? "👍" : props.liked === -1 ? "👎" : "😐";

        const popupContent = `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">
              ${props.wine_name} ${props.wine_year || ""}
            </h3>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              <strong>Domaine:</strong> ${props.domain_name}
            </p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              <strong>Source:</strong> ${props.source_name}
            </p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              <strong>Date:</strong> ${props.created_at}
            </p>
            <p style="margin: 4px 0; font-size: 12px;">
              ${likedEmoji}
            </p>
          </div>
        `;

        new mapboxgl.Popup().setLngLat([coordinates[0], coordinates[1]]).setHTML(popupContent).addTo(map.current!);
      });

      // Changer le curseur au survol
      map.current!.on("mouseenter", "clusters", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current!.on("mouseleave", "clusters", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });
      map.current!.on("mouseenter", "unclustered-point", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current!.on("mouseleave", "unclustered-point", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });

      // Ajuster la vue pour afficher tous les points
      if (tastings.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        tastings.forEach((tasting) => {
          bounds.extend([tasting.longitude, tasting.latitude]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [tastings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (tastings.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Aucune dégustation géolocalisée</p>
          <p className="text-sm text-muted-foreground">Ajoutez des dégustations avec localisation pour voir la carte</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={mapContainer} className="h-[600px] rounded-lg overflow-hidden shadow-lg" />

      {/* Légende */}
      <div className="flex items-center justify-center gap-6 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: SOURCE_COLORS.event }} />
          <span className="text-sm">Événements</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: SOURCE_COLORS.cellar }} />
          <span className="text-sm">Caves</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: SOURCE_COLORS.spontaneous }} />
          <span className="text-sm">Spontanées</span>
        </div>
      </div>
    </div>
  );
}
