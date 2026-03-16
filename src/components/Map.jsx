import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { listenToAvailableDrivers } from '../services/db';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically update map center
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

// Component to handle map clicks
function MapEvents({ onClick }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng);
    },
  });
  return null;
}

const Map = ({ onMapClick, destination }) => {
  const [position, setPosition] = useState([35.3725, 1.3204]); // Default: Tiaret center
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    // 1. Get User Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          console.warn("Geolocation permission denied or unavailable. Using default Tiaret location.");
        }
      );
    }
    
    // 2. Listen to Available Drivers (Firebase)
    // We wrapped this in a try/catch or ignored initial errors to keep the UI working without Firebase Auth
    try {
      const unsubscribe = listenToAvailableDrivers((activeDrivers) => {
        setDrivers(activeDrivers);
      });
      return () => unsubscribe();
    } catch (error) {
       console.warn("Firebase not configured properly yet: ", error);
    }
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <MapContainer 
        center={position} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <ChangeView center={position} zoom={14} />
        <MapEvents onClick={onMapClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* User Current Location */}
        <Marker position={position}>
          <Popup>
            You are here!
          </Popup>
        </Marker>

        {/* Selected Destination */}
        {destination && (
          <Marker 
            position={[destination.lat, destination.lng]}
            icon={new L.Icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })}
          >
            <Popup>Destination</Popup>
          </Marker>
        )}

        {/* Real-time Drivers */}
        {drivers.map(driver => (
          driver.location && (
            <Marker key={driver.id} position={[driver.location.lat, driver.location.lng]}>
              <Popup>
                Driver: {driver.name || driver.id} <br/>
                Vehicle: {driver.vehicle || 'Standard'}
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
