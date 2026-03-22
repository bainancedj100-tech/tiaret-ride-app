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

// ─── Tiaret Locations Data ────────────────────────────────────────────────────
const tiaretLocations = [
  // 🏘️ الأحياء السكنية
  { id: 1,  name: "حي سيدي خالد",          type: "neighborhood", lat: 35.3720, lng: 1.3150 },
  { id: 2,  name: "حي التفاح",              type: "neighborhood", lat: 35.3700, lng: 1.3320 },
  { id: 3,  name: "حي سوناطيبا",            type: "neighborhood", lat: 35.3620, lng: 1.3350 },
  { id: 4,  name: "حي زعرورة",              type: "neighborhood", lat: 35.3421, lng: 1.3131 },
  { id: 5,  name: "حي واد الطلبة",          type: "neighborhood", lat: 35.3529, lng: 1.3112 },
  { id: 6,  name: "حي البدر",               type: "neighborhood", lat: 35.3532, lng: 1.3275 },
  { id: 7,  name: "حي 405 مسكن",            type: "neighborhood", lat: 35.3759, lng: 1.3305 },
  { id: 8,  name: "حي ديار الشمس",          type: "neighborhood", lat: 35.3667, lng: 1.3315 },
  { id: 9,  name: "حي تيتانيك",             type: "neighborhood", lat: 35.3650, lng: 1.3400 },
  { id: 10, name: "حي لاقلاسيار",           type: "neighborhood", lat: 35.3851, lng: 1.3149 },
  { id: 11, name: "حي قيطون",               type: "neighborhood", lat: 35.3800, lng: 1.3200 },
  { id: 12, name: "حي محمد جاهلان",         type: "neighborhood", lat: 35.3580, lng: 1.3250 },
  { id: 13, name: "حي 293 مسكن",            type: "neighborhood", lat: 35.3860, lng: 1.3120 },
  { id: 14, name: "حي الصنوبر",             type: "neighborhood", lat: 35.3820, lng: 1.3080 },
  // 🏥 المستشفيات
  { id: 15, name: "مستشفى يوسف دمرجي",      type: "hospital",    lat: 35.3791, lng: 1.3323 },
  { id: 16, name: "مستشفى كرمان تيارت",     type: "hospital",    lat: 35.3680, lng: 1.3500 },
  { id: 17, name: "مستشفى الأمومة والطفولة",type: "hospital",    lat: 35.3500, lng: 1.3300 },
  { id: 18, name: "المعهد الوطني INFSPM",   type: "hospital",    lat: 35.3840, lng: 1.3150 },
  // 🎓 الجامعات
  { id: 19, name: "جامعة ابن خلدون",        type: "university",  lat: 35.3400, lng: 1.3100 },
  { id: 20, name: "كلية العلوم الاقتصادية", type: "university",  lat: 35.3380, lng: 1.3050 },
  { id: 21, name: "القطب الجامعي",          type: "university",  lat: 35.3550, lng: 1.3200 },
  { id: 22, name: "الإقامة الجامعية 2000",  type: "university",  lat: 35.3720, lng: 1.3450 },
  { id: 23, name: "إقامة ميموني يمينة",     type: "university",  lat: 35.3650, lng: 1.3480 },
  // 🌲 الترفيه والمعالم
  { id: 24, name: "بارك التسلية",           type: "park",        lat: 35.3850, lng: 1.3100 },
  { id: 25, name: "حديقة رستم",             type: "park",        lat: 35.3830, lng: 1.3050 },
  { id: 26, name: "ملعب أحمد قايد",         type: "stadium",     lat: 35.3600, lng: 1.3300 },
  { id: 27, name: "غابة سيدي محمد",         type: "park",        lat: 35.3700, lng: 1.2900 },
  { id: 28, name: "محطة المسافرين البرية",  type: "station",     lat: 35.3600, lng: 1.3150 },
  { id: 29, name: "فندق بوعزة",             type: "landmark",    lat: 35.3650, lng: 1.3200 },
];

// ─── Type config: emoji + color marker url ────────────────────────────────────
const TYPE_CONFIG = {
  neighborhood: { emoji: '🏘️', label: 'الأحياء',    color: 'blue'   },
  hospital:     { emoji: '🏥', label: 'المستشفيات',  color: 'red'    },
  university:   { emoji: '🎓', label: 'الجامعات',    color: 'orange' },
  park:         { emoji: '🌲', label: 'الحدائق',     color: 'green'  },
  stadium:      { emoji: '🏟️', label: 'الملاعب',     color: 'violet' },
  station:      { emoji: '🚌', label: 'المحطات',     color: 'grey'   },
  landmark:     { emoji: '🏨', label: 'المعالم',     color: 'gold'   },
};

const makeIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ─── Sub-components ───────────────────────────────────────────────────────────
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

function MapEvents({ onClick }) {
  useMapEvents({
    click(e) { if (onClick) onClick(e.latlng); },
  });
  return null;
}

// ─── Main Map Component ───────────────────────────────────────────────────────
const Map = ({ onMapClick, destination }) => {
  const [position, setPosition] = useState([35.3725, 1.3204]);
  const [drivers, setDrivers]   = useState([]);
  const [activeTypes, setActiveTypes] = useState(new Set(Object.keys(TYPE_CONFIG)));
  const [legendOpen, setLegendOpen]   = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
        () => console.warn("Geolocation unavailable. Using default Tiaret location.")
      );
    }
    try {
      const unsubscribe = listenToAvailableDrivers((activeDrivers) => setDrivers(activeDrivers));
      return () => unsubscribe();
    } catch (error) {
      console.warn("Firebase not configured properly yet: ", error);
    }
  }, []);

  const toggleType = (type) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      {/* ── Legend / Filter Toggle ── */}
      <div style={{ position: 'absolute', top: 70, left: 10, zIndex: 1000 }}>
        <button
          onClick={() => setLegendOpen(o => !o)}
          style={{
            background: 'rgba(255,255,255,0.92)',
            border: 'none',
            borderRadius: 12,
            padding: '7px 13px',
            fontWeight: 'bold',
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          🗺️ {legendOpen ? 'إخفاء الفلتر' : 'فلتر الأماكن'}
        </button>
        {legendOpen && (
          <div style={{
            marginTop: 6,
            background: 'rgba(255,255,255,0.96)',
            borderRadius: 14,
            padding: '10px 12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            minWidth: 160,
          }}>
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
              <label key={type} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 6, cursor: 'pointer', fontSize: 13,
                opacity: activeTypes.has(type) ? 1 : 0.4,
              }}>
                <input
                  type="checkbox"
                  checked={activeTypes.has(type)}
                  onChange={() => toggleType(type)}
                  style={{ accentColor: '#4f46e5', width: 15, height: 15 }}
                />
                <span>{cfg.emoji} {cfg.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

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

        {/* ── Tiaret Locations ── */}
        {tiaretLocations
          .filter(loc => activeTypes.has(loc.type))
          .map(loc => {
            const cfg = TYPE_CONFIG[loc.type];
            return (
              <Marker
                key={loc.id}
                position={[loc.lat, loc.lng]}
                icon={makeIcon(cfg.color)}
              >
                <Popup>
                  <div style={{ textAlign: 'right', direction: 'rtl', fontFamily: 'sans-serif' }}>
                    <strong style={{ fontSize: 13 }}>{cfg.emoji} {loc.name}</strong>
                    <br />
                    <span style={{ fontSize: 11, color: '#666' }}>{cfg.label}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* ── User Location ── */}
        <Marker position={position}>
          <Popup>📍 أنت هنا</Popup>
        </Marker>

        {/* ── Selected Destination ── */}
        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={makeIcon('red')}
          >
            <Popup>🎯 الوجهة المختارة</Popup>
          </Marker>
        )}

        {/* ── Real-time Drivers ── */}
        {drivers.map(driver =>
          driver.location && (
            <Marker key={driver.id} position={[driver.location.lat, driver.location.lng]}>
              <Popup>
                🚗 {driver.name || driver.id}<br />
                {driver.vehicle || 'سيارة عادية'}
              </Popup>
            </Marker>
          )
        )}
      </MapContainer>
    </div>
  );
};

export default Map;
