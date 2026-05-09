import { useEffect, useMemo, useRef, useState } from "react";
import { Navigation } from "lucide-react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useLanguage } from "../contexts/LanguageContext";
import { api, type LocationSuggestion } from "../services/api";

interface MapPlaceholderProps {
  showRoute?: boolean;
  className?: string;
  pickup?: LocationSuggestion | null;
  destination?: LocationSuggestion | null;
  onRouteResolved?: ((route: { distance: number; duration: number } | null) => void) | undefined;
}

export function MapPlaceholder({
  showRoute = false,
  className = "",
  pickup: pickupSuggestion = null,
  destination: destinationSuggestion = null,
  onRouteResolved
}: MapPlaceholderProps) {
  const mapRef = useRef<L.Map | null>(null);
  const { language } = useLanguage();
  const defaultPickup = useMemo(() => [21.0285, 105.8542] as [number, number], []);
  const defaultDestination = useMemo(() => [21.2187, 105.8042] as [number, number], []);
  const pickup = pickupSuggestion
    ? ([pickupSuggestion.lat, pickupSuggestion.lon] as [number, number])
    : defaultPickup;
  const destination = destinationSuggestion
    ? ([destinationSuggestion.lat, destinationSuggestion.lon] as [number, number])
    : defaultDestination;
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeMeta, setRouteMeta] = useState<{ distance: number; duration: number } | null>(null);

  const pickupIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<div style="width:14px;height:14px;border-radius:999px;background:#16a34a;border:2px solid white;box-shadow:0 0 0 2px #16a34a"></div>',
        iconSize: [14, 14]
      }),
    []
  );

  const destinationIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<div style="width:14px;height:14px;border-radius:999px;background:#dc2626;border:2px solid white;box-shadow:0 0 0 2px #dc2626"></div>',
        iconSize: [14, 14]
      }),
    []
  );

  useEffect(() => {
    if (!showRoute) {
      setRoutePoints([]);
      setRouteMeta(null);
      onRouteResolved?.(null);
      return;
    }
    if (!pickupSuggestion || !destinationSuggestion) {
      setRoutePoints([]);
      setRouteMeta(null);
      onRouteResolved?.(null);
      return;
    }

    let active = true;
    api
      .previewRoute({
        from: { lat: pickupSuggestion.lat, lon: pickupSuggestion.lon },
        to: { lat: destinationSuggestion.lat, lon: destinationSuggestion.lon }
      })
      .then((result) => {
        if (!active) {
          return;
        }
        const points = (result.geometry?.coordinates || []).map(([lon, lat]) => [lat, lon] as [
          number,
          number
        ]);
        setRoutePoints(points.length > 1 ? points : []);
        const route = points.length > 1 ? { distance: result.distance, duration: result.duration } : null;
        setRouteMeta(route);
        onRouteResolved?.(route);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setRoutePoints([]);
        setRouteMeta(null);
        onRouteResolved?.(null);
      });

    return () => {
      active = false;
    };
  }, [
    showRoute,
    pickup,
    destination,
    pickupSuggestion,
    destinationSuggestion,
    onRouteResolved,
    setRouteMeta,
    setRoutePoints
  ]);

  return (
    <div className={`relative bg-gray-200 rounded-lg overflow-hidden ${className}`}>
      <MapContainer
        center={pickup}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
        ref={(instance) => {
          if (instance) {
            mapRef.current = instance;
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={pickup} icon={pickupIcon} />
        {showRoute && destinationSuggestion && (
          <>
            <Marker position={destination} icon={destinationIcon} />
            {routePoints.length > 1 && (
              <Polyline
                positions={routePoints}
                pathOptions={{ color: "#2563eb", weight: 4, dashArray: "8 8" }}
              />
            )}
            <FitRouteBounds points={routePoints} />
          </>
        )}
      </MapContainer>

      <button
        type="button"
        onClick={() => mapRef.current?.setView(pickup, 14)}
        className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-lg"
      >
        <Navigation className="h-5 w-5 text-gray-600" />
      </button>

      <div className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-full text-sm font-semibold text-gray-700">
        {language === "ja" ? "ハノイ市" : "Hanoi, Vietnam"}
      </div>
      {routeMeta && (
        <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-semibold text-gray-700">
          {`${(routeMeta.distance / 1000).toFixed(1)} km • ${Math.round(
            routeMeta.duration / 60
          )} min`}
        </div>
      )}
      {showRoute && !routeMeta && (
        <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded-full text-xs font-semibold text-gray-600">
          Route unavailable. Please reselect locations.
        </div>
      )}
    </div>
  );
}

function FitRouteBounds({
  points
}: {
  points: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}
