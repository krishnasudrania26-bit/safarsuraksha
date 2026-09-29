import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const userIcon = L.divIcon({ className: "ss-user-marker", html: "<span>●</span>", iconSize: [22,22], iconAnchor:[11,11] });
const destinationIcon = L.divIcon({ className: "ss-destination-marker", html: "<span>📍</span>", iconSize:[28,28], iconAnchor:[14,28] });

function FitBounds({ points }) {
  const map = useMap();
  if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [30,30] });
  return null;
}

export default function RealMap({ routes = [], selectedRoute, currentLocation, destination }) {
  const line = (selectedRoute?.geometry?.coordinates || []).map(([lng,lat]) => [lat,lng]);
  const center = currentLocation ? [currentLocation.latitude,currentLocation.longitude] : destination ? [destination.latitude,destination.longitude] : [26.9124,75.7873];
  const allPoints = routes.flatMap(r => (r.geometry?.coordinates || []).map(([lng,lat]) => [lat,lng]));
  return <div className="real-map"><MapContainer center={center} zoom={13} scrollWheelZoom className="real-map-container">
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <FitBounds points={allPoints.length ? allPoints : line} />
    {routes.map(route => {
      const coords=(route.geometry?.coordinates||[]).map(([lng,lat])=>[lat,lng]);
      return <Polyline key={route.id} positions={coords} pathOptions={{ color: route.id===selectedRoute?.id ? "#1765d1" : "#94a3b8", weight: route.id===selectedRoute?.id ? 6 : 4, opacity: route.id===selectedRoute?.id ? .95 : .6, dashArray: route.id===selectedRoute?.id ? undefined : "8 8" }} />;
    })}
    {currentLocation && <Marker position={[currentLocation.latitude,currentLocation.longitude]} icon={userIcon}><Popup>You are here</Popup></Marker>}
    {destination && <Marker position={[destination.latitude,destination.longitude]} icon={destinationIcon}><Popup>Destination</Popup></Marker>}
  </MapContainer></div>;
}
