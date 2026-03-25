import React, { useEffect, useRef, useState } from 'react';
import { listenToAvailableDrivers } from '../services/db';
import { calculateDistanceKm } from '../utils/pricing';

const TIARET_CENTER = { lat: 35.3725, lng: 1.3204 };

const Map = ({ onMapClick, destination, radius = 0.5, showOrders = false, orders = [], assignedDriverLoc = null, showCircle = false }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const driverMarkersRef = useRef({});
  const orderMarkersRef = useRef({});
  const searchCircleRef = useRef(null);
  const clickHandlerRef = useRef(onMapClick);
  const [drivers, setDrivers] = useState([]);
  const [userPos, setUserPos] = useState(null);

  useEffect(() => { clickHandlerRef.current = onMapClick; }, [onMapClick]);

  // ── 1. Initialize light map ──────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current && window.google) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: TIARET_CENTER,
        zoom: 14,
        disableDefaultUI: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [],
      });

      mapInstanceRef.current.addListener('click', (e) => {
        if (clickHandlerRef.current) {
          clickHandlerRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      });
    }
  }, []);

  // ── 2. Search Circle (Expanding) ──────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    if (showCircle && userPos) {
      if (searchCircleRef.current) {
        searchCircleRef.current.setMap(mapInstanceRef.current);
        searchCircleRef.current.setRadius(radius * 1000);
        searchCircleRef.current.setCenter(userPos);
      } else {
        searchCircleRef.current = new window.google.maps.Circle({
          strokeColor: "#3b82f6",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.1,
          map: mapInstanceRef.current,
          center: userPos,
          radius: radius * 1000,
          clickable: false,
        });
      }
    } else {
      if (searchCircleRef.current) {
        searchCircleRef.current.setMap(null);
      }
    }
  }, [radius, showCircle, userPos]);

  // ── 3. Rider's pulsing location dot ───────────────────────────
  useEffect(() => {
    if (!navigator.geolocation || !window.google) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPos(coords);
      if (mapInstanceRef.current) {
        if (!searchCircleRef.current) mapInstanceRef.current.setCenter(coords);
        if (riderMarkerRef.current) riderMarkerRef.current.setMap(null);
        riderMarkerRef.current = new window.google.maps.Marker({
          position: coords,
          map: mapInstanceRef.current,
          title: "موقعك",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
      }
    }, () => {}, { enableHighAccuracy: true });
  }, []);

  // ── 4. Listen to Drivers & Orders ──────────────────────────────
  useEffect(() => {
    const unsub = listenToAvailableDrivers(setDrivers);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    // Remove stale drivers
    const currentIds = drivers.map(d => d.id);
    Object.keys(driverMarkersRef.current).forEach(id => {
      if (!currentIds.includes(id)) {
        driverMarkersRef.current[id].setMap(null);
        delete driverMarkersRef.current[id];
      }
    });

    // Update driver markers
    drivers.forEach(driver => {
      if (!driver.location) return;
      
      const pos = { lat: driver.location.lat, lng: driver.location.lng };
      
      // Filter by radius
      let isWithinRadius = true;
      if (userPos && radius > 0) {
        isWithinRadius = calculateDistanceKm(userPos.lat, userPos.lng, pos.lat, pos.lng) <= radius;
      }

      if (!isWithinRadius) {
        if (driverMarkersRef.current[driver.id]) {
          driverMarkersRef.current[driver.id].setMap(null);
          delete driverMarkersRef.current[driver.id];
        }
        return;
      }

      if (driverMarkersRef.current[driver.id]) {
        driverMarkersRef.current[driver.id].setPosition(pos);
      } else {
        driverMarkersRef.current[driver.id] = new window.google.maps.Marker({
          position: pos,
          map: mapInstanceRef.current,
          title: driver.vehicle || "سائق",
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: "#f59e0b",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 1,
          },
          label: {
            text: `🚖 ${driver.vehicle || ''}`,
            color: "#b45309",
            fontSize: "10px",
            fontWeight: "bold",
            className: "mt-8"
          }
        });
      }
    });

    // Update order markers if showOrders is true
    if (showOrders) {
      const orderIds = orders.map(o => o.id);
      Object.keys(orderMarkersRef.current).forEach(id => {
        if (!orderIds.includes(id)) {
          orderMarkersRef.current[id].setMap(null);
          delete orderMarkersRef.current[id];
        }
      });

      orders.forEach(order => {
        if (!order.destination) return;
        
        // Filter by radius
        let isWithinRadius = true;
        if (userPos && radius > 0) {
          isWithinRadius = calculateDistanceKm(userPos.lat, userPos.lng, order.destination.lat, order.destination.lng) <= radius;
        }

        if (!isWithinRadius) {
          if (orderMarkersRef.current[order.id]) {
            orderMarkersRef.current[order.id].setMap(null);
            delete orderMarkersRef.current[order.id];
          }
          return;
        }

        if (!orderMarkersRef.current[order.id]) {
          orderMarkersRef.current[order.id] = new window.google.maps.Marker({
            position: order.destination,
            map: mapInstanceRef.current,
            title: "طلب جديد",
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
            }
          });
        }
      });
    }
  }, [drivers, orders, showOrders]);

  // ── 5. Assigned Driver Tracking (Rider view) ─────────────────
  const assignedDriverMarkerRef = useRef(null);
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    if (assignedDriverLoc) {
      const pos = { lat: assignedDriverLoc.lat, lng: assignedDriverLoc.lng };
      if (!assignedDriverMarkerRef.current) {
        assignedDriverMarkerRef.current = new window.google.maps.Marker({
          position: pos,
          map: mapInstanceRef.current,
          title: "السائق",
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 7,
            fillColor: "#22c55e",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            rotation: 0,
          },
          label: {
            text: "سائقك 🚖",
            color: "#166534",
            fontSize: "12px",
            fontWeight: "bold",
          },
          zIndex: 999,
        });
      } else {
        assignedDriverMarkerRef.current.setPosition(pos);
      }
    } else {
      if (assignedDriverMarkerRef.current) {
        assignedDriverMarkerRef.current.setMap(null);
        assignedDriverMarkerRef.current = null;
      }
    }
  }, [assignedDriverLoc]);

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default Map;
