import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertTriangle, MapPin, Wine } from "lucide-react";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

interface TastingsMapProps {
  sourceFilter?: string | null;
  userId?: string;
  onShareStory?: (tastingId: string) => void;
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
  label_url: string | null;
}

const SOURCE_COLORS: Record<string, string> = {
  event: "#3b82f6",
  cellar: "#a855f7",
  spontaneous: "#ef4444",
};

const SOURCE_LABELS: Record<string, string> = {
  event: "Événements",
  cellar: "Caves",
  spontaneous: "Spontanées",
};

const DEFAULT_LABEL_URL = "https://amzutunyjouejovlrlah.supabase.co/storage/v1/object/public/domain/tmp/default.png";

// Group tastings by identical coordinates
function groupByLocation(tastings: TastingLocation[]): Map<string, TastingLocation[]> {
  const groups = new Map<string, TastingLocation[]>();
  for (const t of tastings) {
    const key = `${t.latitude},${t.longitude}`;
    const arr = groups.get(key) || [];
    arr.push(t);
    groups.set(key, arr);
  }
  return groups;
}

// Create a pin SVG for a given color
function createPinSVG(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <defs>
      <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
      </filter>
    </defs>
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}" filter="url(#shadow)"/>
    <circle cx="14" cy="13" r="6" fill="white" opacity="0.9"/>
    <text x="14" y="17" text-anchor="middle" font-size="12" fill="${color}">🍷</text>
  </svg>`;
}

function svgToImage(svg: string, size: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(size, size);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

// Create a rounded photo marker with colored border
function createPhotoMarker(imageUrl: string, borderColor: string, size: number = 64): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = size * scale;
      canvas.height = size * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      const borderWidth = 4;
      const half = size / 2;
      const innerRadius = half - borderWidth;

      ctx.fillStyle = borderColor;
      ctx.beginPath();
      ctx.arc(half, half, half, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(half, half, innerRadius, 0, Math.PI * 2);
      ctx.clip();

      const imgAspect = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgAspect > 1) {
        sx = (img.width - img.height) / 2;
        sw = img.height;
      } else {
        sy = (img.height - img.width) / 2;
        sh = img.width;
      }
      ctx.drawImage(img, sx, sy, sw, sh, borderWidth, borderWidth, innerRadius * 2, innerRadius * 2);

      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}

// Create a composite marker for groups of co-located tastings
function createGroupMarker(
  images: (string | null)[],
  colors: string[],
  count: number,
  size: number = 64
): Promise<HTMLCanvasElement> {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      const scale = 2;
      const totalWidth = size + 16;
      canvas.width = totalWidth * scale;
      canvas.height = size * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      const drawCirclePhoto = async (
        cx: number, cy: number, radius: number,
        imageUrl: string | null, borderColor: string
      ) => {
        const borderWidth = 4;
        const innerRadius = radius - borderWidth;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = borderColor;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        if (imageUrl && imageUrl !== DEFAULT_LABEL_URL) {
          try {
            const img = await loadImage(imageUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
            ctx.clip();
            const imgAspect = img.width / img.height;
            let sx = 0, sy = 0, sw = img.width, sh = img.height;
            if (imgAspect > 1) { sx = (img.width - img.height) / 2; sw = img.height; }
            else { sy = (img.height - img.width) / 2; sh = img.width; }
            ctx.drawImage(img, sx, sy, sw, sh, cx - innerRadius, cy - innerRadius, innerRadius * 2, innerRadius * 2);
            ctx.restore();
          } catch {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = "#f5f5f5";
            ctx.fill();
            ctx.restore();
            ctx.font = `${innerRadius}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🍷", cx, cy);
          }
        } else {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = "#f5f5f5";
          ctx.fill();
          ctx.restore();
          ctx.font = `${innerRadius}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🍷", cx, cy);
        }
      };

      const smallR = size / 2 - 4;
      if (images.length >= 2) {
        await drawCirclePhoto(size / 2 + 14, size / 2, smallR, images[1], colors[1] || colors[0]);
      }
      await drawCirclePhoto(size / 2, size / 2, smallR, images[0], colors[0]);

      const badgeR = 11;
      const badgeX = size + 6;
      const badgeY = size - badgeR - 2;
      ctx.fillStyle = "#1f2937";
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(count), badgeX, badgeY);

      resolve(canvas);
    } catch (err) {
      reject(err);
    }
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load"));
    img.src = url;
  });
}

// ── Dark-mode-aware popup HTML builders ──

function getPopupStyles(): string {
  return `
    <style>
      .map-popup { padding: 4px 0; color: hsl(var(--foreground)); }
      .map-popup h3, .map-popup h4 { margin: 0 0 4px 0; font-weight: 600; font-family: inherit; }
      .map-popup h3 { font-size: 14px; }
      .map-popup h4 { font-size: 13px; }
      .map-popup .meta { margin: 2px 0; font-size: 12px; color: hsl(var(--muted-foreground)); }
      .map-popup .meta-sm { margin: 1px 0; font-size: 11px; color: hsl(var(--muted-foreground)); }
      .map-popup .actions { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
      .map-popup .wine-link-btn {
        padding: 4px 10px; font-size: 11px; border-radius: 6px;
        background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
        text-decoration: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
        border: none; font-weight: 500;
      }
      .map-popup .wine-link-btn:hover { opacity: 0.9; }
      .map-popup .tasting-story-btn {
        padding: 4px 10px; font-size: 11px; border: 1px solid hsl(var(--border));
        border-radius: 6px; background: hsl(var(--background)); color: hsl(var(--foreground));
        cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
      }
      .map-popup .tasting-story-btn:hover { background: hsl(var(--accent)); }
      .map-popup .divider { border-top: 1px solid hsl(var(--border)); margin: 6px 0; }
      .map-popup .group-header { margin: 0 0 6px 0; font-size: 11px; color: hsl(var(--muted-foreground)); font-weight: 600; }
      .mapboxgl-popup-content {
        background: hsl(var(--card)) !important;
        color: hsl(var(--card-foreground)) !important;
        border: 1px solid hsl(var(--border)) !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
        padding: 12px !important;
      }
      .mapboxgl-popup-tip {
        border-top-color: hsl(var(--card)) !important;
      }
    </style>
  `;
}

function buildSinglePopupHTML(
  props: Record<string, any>,
  onShareStory?: (id: string) => void
): string {
  const storyButton = onShareStory
    ? `<button data-tasting-id="${props.id}" class="tasting-story-btn">📸 Story</button>`
    : "";

  return `
    ${getPopupStyles()}
    <div class="map-popup">
      <h3>${props.wine_name} ${props.wine_year || ""}</h3>
      <p class="meta"><strong>Domaine:</strong> ${props.domain_name}</p>
      <p class="meta"><strong>Source:</strong> ${props.source_name}</p>
      <p class="meta"><strong>Date:</strong> ${props.created_at}</p>
      <div class="actions">
        <a href="/wine/${props.wine_id}" class="wine-link-btn">🍷 Voir le vin</a>
        ${storyButton}
      </div>
    </div>
  `;
}

function buildGroupPopupHTML(
  tastings: Array<Record<string, any>>,
  onShareStory?: (id: string) => void
): string {
  const items = tastings.map((t, i) => {
    const storyButton = onShareStory
      ? `<button data-tasting-id="${t.id}" class="tasting-story-btn">📸</button>`
      : "";

    const separator = i < tastings.length - 1 ? `<div class="divider"></div>` : "";

    return `
      <div>
        <h4>${t.wine_name} ${t.wine_year || ""}</h4>
        <p class="meta-sm">${t.domain_name} · ${t.source_name}</p>
        <p class="meta-sm">${t.created_at}</p>
        <div class="actions">
          <a href="/wine/${t.wine_id}" class="wine-link-btn">🍷 Voir</a>
          ${storyButton}
        </div>
      </div>
      ${separator}
    `;
  }).join("");

  return `
    ${getPopupStyles()}
    <div class="map-popup" style="max-height:250px;overflow-y:auto;min-width:220px;">
      <p class="group-header">${tastings.length} dégustations ici</p>
      ${items}
    </div>
  `;
}

export default function TastingsMap({ sourceFilter, userId, onShareStory }: TastingsMapProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const targetUserId = userId || user?.id;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tastings, setTastings] = useState<TastingLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hiddenSources, setHiddenSources] = useState<Set<string>>(new Set());

  // SPA navigation handler for wine links inside popups
  const handlePopupNavigation = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.href) {
      navigate(detail.href);
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener("map-navigate", handlePopupNavigation);
    return () => window.removeEventListener("map-navigate", handlePopupNavigation);
  }, [handlePopupNavigation]);

  useEffect(() => {
    if (!targetUserId) return;

    const fetchTastings = async () => {
      try {
        setError(null);
        const { data, error: rpcError } = await supabase.rpc("get_user_tastings_with_location", {
          p_user_id: targetUserId,
          p_source_filter: sourceFilter,
        });

        if (rpcError) {
          logger.error("[TastingsMap] RPC error:", rpcError);
          setError(`Erreur de chargement des données: ${rpcError.message}`);
          return;
        }

        setTastings(data || []);
      } catch (err) {
        const msg = getErrorMessage(err);
        logger.error("[TastingsMap] Unexpected error:", err);
        setError(`Erreur inattendue: ${msg}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTastings();
  }, [targetUserId, sourceFilter]);

  // Toggle source filter on the map layer
  const toggleSource = useCallback((sourceType: string) => {
    setHiddenSources(prev => {
      const next = new Set(prev);
      if (next.has(sourceType)) {
        next.delete(sourceType);
      } else {
        next.add(sourceType);
      }
      return next;
    });
  }, []);

  // Apply filter to map when hiddenSources changes
  useEffect(() => {
    if (!map.current || !map.current.getLayer("unclustered-point")) return;

    if (hiddenSources.size === 0) {
      // No filter — show all
      map.current.setFilter("unclustered-point", ["!", ["has", "point_count"]]);
    } else {
      const visibleTypes = Object.keys(SOURCE_COLORS).filter(t => !hiddenSources.has(t));
      map.current.setFilter("unclustered-point", [
        "all",
        ["!", ["has", "point_count"]],
        ["in", ["get", "filter_source"], ["literal", visibleTypes]],
      ]);
    }
  }, [hiddenSources]);

  useEffect(() => {
    if (!mapContainer.current || tastings.length === 0) return;

    let storyClickHandler: ((e: MouseEvent) => void) | null = null;

    if (!MAPBOX_TOKEN) {
      logger.error("[TastingsMap] Token Mapbox manquant (VITE_MAPBOX_TOKEN)");
      setError("Configuration carte manquante. Contactez l'administrateur.");
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [2.3522, 48.8566],
      zoom: 5,
    });

    map.current.on("error", (e) => {
      logger.error("[TastingsMap] Mapbox runtime error:", e.error);
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", async () => {
      if (!map.current) return;

      // Add fallback pin images for each source type
      for (const [sourceType, color] of Object.entries(SOURCE_COLORS)) {
        try {
          const img = await svgToImage(createPinSVG(color), 56);
          if (map.current) {
            map.current.addImage(`pin-${sourceType}`, img, { pixelRatio: 2 });
          }
        } catch (err) {
          logger.error(`[TastingsMap] Failed to load pin image for ${sourceType}`, err);
        }
      }

      // Group tastings by location
      const locationGroups = groupByLocation(tastings);
      const loadedImages = new Set<string>();

      // ── PARALLEL image loading ──
      const imageLoadTasks: Array<{
        key: string;
        promise: Promise<HTMLCanvasElement>;
      }> = [];

      for (const [, group] of locationGroups) {
        if (group.length === 1) {
          const tasting = group[0];
          if (tasting.label_url && tasting.label_url !== DEFAULT_LABEL_URL) {
            const imageId = `wine-${tasting.id}`;
            imageLoadTasks.push({
              key: imageId,
              promise: Promise.race([
                createPhotoMarker(tasting.label_url, SOURCE_COLORS[tasting.source_type] || "#888", 64),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
              ]),
            });
          }
        } else {
          const groupKey = `group-${group[0].latitude}-${group[0].longitude}`;
          const images = group.slice(0, 2).map(t => t.label_url);
          const colors = group.slice(0, 2).map(t => SOURCE_COLORS[t.source_type] || "#888");
          imageLoadTasks.push({
            key: groupKey,
            promise: Promise.race([
              createGroupMarker(images, colors, group.length, 64),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
            ]),
          });
        }
      }

      // Await all in parallel
      const results = await Promise.allSettled(imageLoadTasks.map(t => t.promise));

      results.forEach((result, i) => {
        if (result.status === "fulfilled" && map.current) {
          const canvas = result.value;
          const ctx = canvas.getContext("2d")!;
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const key = imageLoadTasks[i].key;
          try {
            map.current.addImage(key, {
              width: canvas.width,
              height: canvas.height,
              data: new Uint8Array(imageData.data.buffer),
            });
            loadedImages.add(key);
          } catch (err) {
            logger.error(`[TastingsMap] Failed to add image ${key}`, err);
          }
        } else if (result.status === "rejected") {
          logger.error(`[TastingsMap] Failed to load marker image: ${imageLoadTasks[i].key}`, result.reason);
        }
      });

      // Build GeoJSON features — one per location group
      const features: GeoJSON.Feature[] = [];

      for (const [, group] of locationGroups) {
        const first = group[0];
        if (group.length === 1) {
          const imageId = `wine-${first.id}`;
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [first.longitude, first.latitude] },
            properties: {
              id: first.id,
              wine_id: first.wine_id,
              wine_name: first.wine_name,
              wine_year: first.wine_year,
              domain_name: first.domain_name,
              source_type: first.source_type,
              filter_source: first.source_type,
              source_name: first.source_name,
              created_at: new Date(first.created_at).toLocaleDateString("fr-FR"),
              icon: loadedImages.has(imageId) ? imageId : `pin-${first.source_type}`,
              is_group: false,
              group_data: null,
            },
          });
        } else {
          const groupKey = `group-${first.latitude}-${first.longitude}`;
          // Use dominant source type for filtering
          const sourceCounts: Record<string, number> = {};
          group.forEach(t => { sourceCounts[t.source_type] = (sourceCounts[t.source_type] || 0) + 1; });
          const dominantSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0][0];

          const groupData = group.map(t => ({
            id: t.id,
            wine_id: t.wine_id,
            wine_name: t.wine_name,
            wine_year: t.wine_year,
            domain_name: t.domain_name,
            source_name: t.source_name,
            created_at: new Date(t.created_at).toLocaleDateString("fr-FR"),
          }));
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [first.longitude, first.latitude] },
            properties: {
              id: groupKey,
              is_group: true,
              filter_source: dominantSource,
              group_count: group.length,
              group_data: JSON.stringify(groupData),
              icon: loadedImages.has(groupKey) ? groupKey : `pin-${first.source_type}`,
            },
          });
        }
      }

      const geojson: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };

      map.current!.addSource("tastings", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
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

      // Cluster count
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

      // Individual/group pins
      map.current!.addLayer({
        id: "unclustered-point",
        type: "symbol",
        source: "tastings",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            4, 0.35,
            8, 0.55,
            12, 0.85,
          ],
          "icon-anchor": "center",
          "icon-allow-overlap": true,
        },
      });

      // Click cluster to zoom
      map.current!.on("click", "clusters", (e) => {
        if (!map.current) return;
        const features = map.current.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current.getSource("tastings") as mapboxgl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return;
          const coordinates = (features[0].geometry as GeoJSON.Point).coordinates;
          map.current.easeTo({ center: [coordinates[0], coordinates[1]], zoom });
        });
      });

      // Popup on individual/group points
      map.current!.on("click", "unclustered-point", (e) => {
        if (!e.features || !e.features[0]) return;

        const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice();
        const props = e.features[0].properties;

        let popupContent: string;

        if (props?.is_group === true || props?.is_group === "true") {
          try {
            const groupData = JSON.parse(props.group_data);
            popupContent = buildGroupPopupHTML(groupData, onShareStory);
          } catch {
            popupContent = `<p>Erreur d'affichage</p>`;
          }
        } else {
          popupContent = buildSinglePopupHTML(props as any, onShareStory);
        }

        new mapboxgl.Popup({ offset: [0, -10], maxWidth: "280px" })
          .setLngLat([coordinates[0], coordinates[1]])
          .setHTML(popupContent)
          .addTo(map.current!);
      });

      // Listen for story button clicks & wine link SPA navigation
      storyClickHandler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        // Story button
        if (onShareStory) {
          const btn = target.closest(".tasting-story-btn") as HTMLElement | null;
          if (btn) {
            const tastingId = btn.getAttribute("data-tasting-id");
            if (tastingId) onShareStory(tastingId);
            return;
          }
        }

        // Wine link — SPA navigation via custom event
        const link = target.closest(".wine-link-btn") as HTMLAnchorElement | null;
        if (link) {
          e.preventDefault();
          const href = link.getAttribute("href");
          if (href) {
            window.dispatchEvent(new CustomEvent("map-navigate", { detail: { href } }));
          }
        }
      };
      mapContainer.current?.addEventListener("click", storyClickHandler);

      // Cursor changes
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

      // Fit bounds
      if (tastings.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        tastings.forEach((tasting) => {
          bounds.extend([tasting.longitude, tasting.latitude]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }
    });

    return () => {
      if (storyClickHandler && mapContainer.current) {
        mapContainer.current.removeEventListener("click", storyClickHandler);
      }
      map.current?.remove();
    };
  }, [tastings, onShareStory]);

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
          <p className="text-lg font-medium">Erreur</p>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  if (tastings.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
        <div className="text-center space-y-4">
          <MapPin className="h-10 w-10 mx-auto text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-lg font-medium">Aucune dégustation géolocalisée</p>
            <p className="text-sm text-muted-foreground">Dégustez un vin lors d'un événement ou ajoutez une dégustation spontanée</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/events")}>
              <Wine className="h-4 w-4 mr-1" />
              Voir les événements
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={mapContainer} className="h-[600px] rounded-lg overflow-hidden shadow-lg" />

      {/* Interactive filterable legend */}
      <div className="flex items-center justify-center gap-4 p-3 bg-muted rounded-lg flex-wrap">
        {Object.entries(SOURCE_COLORS).map(([key, color]) => {
          const isHidden = hiddenSources.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleSource(key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer border ${
                isHidden
                  ? "opacity-40 border-border bg-background line-through"
                  : "opacity-100 border-transparent bg-background/50 hover:bg-background"
              }`}
            >
              <div
                className="w-3.5 h-3.5 rounded-full shrink-0 transition-transform"
                style={{ backgroundColor: color, transform: isHidden ? "scale(0.7)" : "scale(1)" }}
              />
              <span className="text-foreground">{SOURCE_LABELS[key]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
