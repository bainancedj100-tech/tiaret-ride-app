import React, { useEffect, useRef, useState } from 'react';
import { listenToAvailableDrivers } from '../services/db';

const Map = ({ onMapClick, destination }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const driverMarkersRef = useRef({});
  const clickHandlerRef = useRef(onMapClick);
  const [drivers, setDrivers] = useState([]);

  // Keep click handler ref updated
  useEffect(() => {
    clickHandlerRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize Map
  useEffect(() => {
    if (!mapInstanceRef.current && window.google) {
      const tiaretCenter = { lat: 35.371, lng: 1.317 };
      const darkMapStyle = [
        { elementType: "geometry", stylers: [{ color: "#1a1f2b" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a1f2b" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
        { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4b5563" }] },
        { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
        { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
        { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
        { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
        { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
      ];

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: tiaretCenter,
        zoom: 14,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false, // Turn off map type to keep it clean
        streetViewControl: false, // Turn off street view
        fullscreenControl: false, // Turn off fullscreen
        gestureHandling: 'greedy', // 🟢 Fix: One finger panning on mobile
        styles: darkMapStyle, // Programmatic Dark Mode
        mapId: 'TIARET_DARK_MAP_ID' // Fallback to Advanced Marker if enabled later
      });

      // Handle Map Click via Ref to avoid listener churn
      mapInstanceRef.current.addListener('click', (e) => {
        if (clickHandlerRef.current) {
          clickHandlerRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      });
    }
  }, []); // Only once

  // Track User Location
  useEffect(() => {
    if (navigator.geolocation && window.google) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(coords);
            if (userMarkerRef.current) {
              userMarkerRef.current.setPosition(coords);
            } else {
              userMarkerRef.current = new window.google.maps.Marker({
                position: coords,
                map: mapInstanceRef.current,
                title: "أنت هنا",
                icon: {
                  url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                }
              });
            }
          }
        },
        () => console.warn('Geolocation unavailable')
      );
    }
  }, []);

  // Sync Destination Marker
  useEffect(() => {
    if (mapInstanceRef.current && window.google) {
      if (destination) {
        const destPos = { lat: destination.lat, lng: destination.lng };
        if (destinationMarkerRef.current) {
          destinationMarkerRef.current.setPosition(destPos);
        } else {
          destinationMarkerRef.current = new window.google.maps.Marker({
            position: destPos,
            map: mapInstanceRef.current,
            title: "الوجهة",
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
            }
          });
        }
      } else if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null);
        destinationMarkerRef.current = null;
      }
    }
  }, [destination]);

  // Sync Drivers
  useEffect(() => {
    const unsub = listenToAvailableDrivers(setDrivers);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && window.google) {
      // Remove stale markers
      const currentIds = drivers.map(d => d.id);
      Object.keys(driverMarkersRef.current).forEach(id => {
        if (!currentIds.includes(id)) {
          driverMarkersRef.current[id].setMap(null);
          delete driverMarkersRef.current[id];
        }
      });

      // Update/Add markers
      drivers.forEach(driver => {
        if (driver.location) {
          const pos = { lat: driver.location.lat, lng: driver.location.lng };
          if (driverMarkersRef.current[driver.id]) {
            driverMarkersRef.current[driver.id].setPosition(pos);
          } else {
            driverMarkersRef.current[driver.id] = new window.google.maps.Marker({
              position: pos,
              map: mapInstanceRef.current,
              title: driver.name || "سائق",
              icon: {
                url: "https://maps.google.com/mapfiles/kml/shapes/cabs.png",
                scaledSize: new window.google.maps.Size(32, 32)
              }
            });
          }
        }
      });
    }
  }, [drivers]);

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default Map;
