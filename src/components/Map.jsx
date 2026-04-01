import React, { useEffect, useRef, useState } from 'react';
import { listenToAvailableDrivers } from '../services/db';
import { calculateDistanceKm } from '../utils/pricing';

const TIARET_CENTER = { lat: 35.3725, lng: 1.3204 };

const Map = ({ onMapClick, destination, radius = 0.5, showOrders = false, orders = [], assignedDriverLoc = null, showCircle = false, routeOrigin = null, routeDestination = null, userLoc = null }) => {
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
    const initMap = () => {
      if (!mapInstanceRef.current && window.google) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: TIARET_CENTER,
          zoom: 14,
          disableDefaultUI: false,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [], // standard light map
        });

        mapInstanceRef.current.addListener('click', (e) => {
          if (clickHandlerRef.current) {
            clickHandlerRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          }
        });
      }
    };

    if (window.google) {
      initMap();
    } else {
      // In case the async script is still loading
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          initMap();
        }
      }, 500);
      return () => clearInterval(interval);
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
  }, [radius, showCircle, userLoc || userPos]);

  // ── 3. Handle Centering & User Pos Prop ─────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    
    const pos = userLoc || userPos || TIARET_CENTER;
    mapInstanceRef.current.panTo(pos);
    
    // Update or create the marker for the driver/rider
    if (userLoc || userPos) {
      const activePos = userLoc || userPos;
      if (!riderMarkerRef.current) {
        riderMarkerRef.current = new window.google.maps.Marker({
          position: activePos,
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
      } else {
        riderMarkerRef.current.setPosition(activePos);
      }
    }
  }, [userLoc]);

  // Keep the old pulsing location helper for fallback
  useEffect(() => {
    if (userLoc) return; // UserLoc from prop takes priority
    const doLoc = () => {
      if (!window.google) { setTimeout(doLoc, 1000); return; }
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(coords);
      }, () => {}, { enableHighAccuracy: true });
    };
    doLoc();
  }, [userLoc]);

  // Handle destination marker separately
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    if (destination) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new window.google.maps.Marker({
          position: destination,
          map: mapInstanceRef.current,
        });
      } else {
        destinationMarkerRef.current.setPosition(destination);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null);
      destinationMarkerRef.current = null;
    }
  }, [destination]);

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
        const orderLoc = order.origin || order.destination;
        if (!orderLoc) return;
        
        let isWithinRadius = true;
        const currentRefPos = userPos || TIARET_CENTER;
        if (radius > 0) {
          isWithinRadius = calculateDistanceKm(currentRefPos.lat, currentRefPos.lng, orderLoc.lat, orderLoc.lng) <= radius;
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
            position: orderLoc,
            map: mapInstanceRef.current,
            title: "طلب جديد",
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
            }
          });
        }
      });
    } else {
      // Hide all orders if not showing
      Object.keys(orderMarkersRef.current).forEach(id => {
        orderMarkersRef.current[id].setMap(null);
        delete orderMarkersRef.current[id];
      });
    }
  }, [drivers, orders, showOrders, userPos, radius]);

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

  // ── 6. Directions Renderer (Route drawing) ───────────────────
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const lastRouteStrRef = useRef('');

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
    }
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 5
        }
      });
    }

    if (routeOrigin && routeDestination) {
      const currentRouteStr = JSON.stringify({ o: routeOrigin, d: routeDestination });
      if (lastRouteStrRef.current === currentRouteStr) return;
      
      lastRouteStrRef.current = currentRouteStr;

      if (!directionsRendererRef.current.getMap()) {
        directionsRendererRef.current.setMap(mapInstanceRef.current);
      }
      directionsServiceRef.current.route({
        origin: routeOrigin,
        destination: routeDestination,
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          directionsRendererRef.current.setDirections(result);
        } else {
          console.error('Error fetching directions via Google Maps API:', status);
        }
      });
    } else if (directionsRendererRef.current) {
      // Clear route but keep the renderer object alive
      directionsRendererRef.current.setMap(null);
      lastRouteStrRef.current = '';
    }
  }, [routeOrigin, routeDestination]);

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default Map;
