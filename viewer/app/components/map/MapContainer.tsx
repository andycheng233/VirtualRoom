"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { YALE_MAP_CENTER, YALE_MAP_BOUNDS } from "../../data/locations";

interface MapContainerProps {
  mode: "guess" | "result";
  onGuessPlaced?: (lat: number, lng: number) => void;
  guessCoords?: { lat: number; lng: number } | null;
  actualCoords?: { lat: number; lng: number };
}

export default function MapContainer({
  mode,
  onGuessPlaced,
  guessCoords,
  actualCoords,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const guessMarker = useRef<mapboxgl.Marker | null>(null);
  const actualMarker = useRef<mapboxgl.Marker | null>(null);
  const onGuessPlacedRef = useRef(onGuessPlaced);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  // Keep the callback ref updated
  useEffect(() => {
    onGuessPlacedRef.current = onGuessPlaced;
  }, [onGuessPlaced]);

  // Initialize map once
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [YALE_MAP_CENTER.lng, YALE_MAP_CENTER.lat],
      zoom: 15,
      maxBounds: [
        [YALE_MAP_BOUNDS.west, YALE_MAP_BOUNDS.south],
        [YALE_MAP_BOUNDS.east, YALE_MAP_BOUNDS.north],
      ],
    });

    mapInstance.on("load", () => {
      setIsStyleLoaded(true);
      mapInstance.on("click", (e) => {
        if (onGuessPlacedRef.current) {
          onGuessPlacedRef.current(e.lngLat.lat, e.lngLat.lng);
        }
      });
    });

    map.current = mapInstance;

    return () => {
      mapInstance.remove();
      map.current = null;
      setIsStyleLoaded(false);
    };
  }, []);

  // Update guess marker
  useEffect(() => {
    if (!map.current) return;

    guessMarker.current?.remove();

    if (guessCoords) {
      guessMarker.current = new mapboxgl.Marker({ color: "#ef4444" })
        .setLngLat([guessCoords.lng, guessCoords.lat])
        .addTo(map.current);
    }
  }, [guessCoords]);

  // Show result (actual location + line)
  useEffect(() => {
    if (!map.current || !isStyleLoaded || mode !== "result") return;

    actualMarker.current?.remove();

    if (actualCoords) {
      actualMarker.current = new mapboxgl.Marker({ color: "#22c55e" })
        .setLngLat([actualCoords.lng, actualCoords.lat])
        .addTo(map.current);

      // Draw line between guess and actual
      if (guessCoords) {
        // Remove existing route if present
        if (map.current.getSource("route")) {
          map.current.removeLayer("route");
          map.current.removeSource("route");
        }

        map.current.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [guessCoords.lng, guessCoords.lat],
                [actualCoords.lng, actualCoords.lat],
              ],
            },
          },
        });

        map.current.addLayer({
          id: "route",
          type: "line",
          source: "route",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 3,
            "line-dasharray": [2, 2],
          },
        });

        // Fit bounds to show both markers
        const bounds = new mapboxgl.LngLatBounds()
          .extend([guessCoords.lng, guessCoords.lat])
          .extend([actualCoords.lng, actualCoords.lat]);

        map.current.fitBounds(bounds, { padding: 50 });
      }
    }

    return () => {
      if (map.current?.getStyle() && map.current.getSource("route")) {
        map.current.removeLayer("route");
        map.current.removeSource("route");
      }
    };
  }, [mode, actualCoords, guessCoords, isStyleLoaded]);

  return <div ref={mapContainer} className="w-full h-full rounded-lg" />;
}
