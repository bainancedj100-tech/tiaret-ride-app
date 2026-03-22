import React, { useEffect, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Tooltip,
  LayersControl, LayerGroup, useMap, useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { listenToAvailableDrivers } from '../services/db';

// Fix default icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Emoji divIcons ──────────────────────────────────────────────────────────
const makeEmoji = (emoji, size = 22) => L.divIcon({
  html: `<span style="font-size:${size}px;line-height:1;display:block;text-align:center;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.4))">${emoji}</span>`,
  className: 'custom-icon',
  iconSize:   [size, size],
  iconAnchor: [size / 2, size / 2],
  popupAnchor:[0, -(size / 2 + 4)],
});

const ICONS = {
  neighborhood: makeEmoji('📍', 20),
  admin:        makeEmoji('🏛️', 22),
  highschool:   makeEmoji('📚', 20),
  primary:      makeEmoji('📖', 20),
  mosque:       makeEmoji('🕌', 22),
  driver:       makeEmoji('🚗', 24),
  user:         makeEmoji('🔵', 20),
  destination:  makeEmoji('🎯', 26),
};

// ── Landmark Data ────────────────────────────────────────────────────────────
const NEIGHBORHOODS = [
  { name: 'حي 500 سكن التفاح',       lat: 35.3685, lng: 1.3250 },
  { name: 'حي لاسيا (الإخوة قيطون)', lat: 35.3700, lng: 1.3100 },
  { name: 'حي سيدي خالد',            lat: 35.3650, lng: 1.3300 },
  { name: 'حي ديار الشمس',           lat: 35.3720, lng: 1.3180 },
  { name: 'حي الجامعة',              lat: 35.3670, lng: 1.3220 },
  { name: 'حي كارمان',               lat: 35.3690, lng: 1.3150 },
  { name: 'حي 700 سكن',              lat: 35.3735, lng: 1.3125 },
  { name: 'حي السنيا',               lat: 35.3750, lng: 1.3200 },
  { name: 'حي الأتراك',              lat: 35.3715, lng: 1.3165 },
  { name: 'حي قايد أحمد',            lat: 35.3660, lng: 1.3290 },
  { name: 'حي عين مصباح',            lat: 35.3680, lng: 1.3280 },
  { name: 'حي واد الطلبة',           lat: 35.3725, lng: 1.3140 },
  { name: 'حي الرودوت',              lat: 35.3705, lng: 1.3160 },
  { name: 'حي التفاح',               lat: 35.3700, lng: 1.3320 },
  { name: 'حي سوناطيبا',             lat: 35.3620, lng: 1.3350 },
  { name: 'حي البدر',                lat: 35.3532, lng: 1.3275 },
  { name: 'حي 405 مسكن',             lat: 35.3759, lng: 1.3305 },
  { name: 'حي تيتانيك',              lat: 35.3650, lng: 1.3400 },
  { name: 'حي لاقلاسيار',            lat: 35.3851, lng: 1.3149 },
  { name: 'حي 293 مسكن',             lat: 35.3860, lng: 1.3120 },
  { name: 'حي الصنوبر',              lat: 35.3820, lng: 1.3080 },
  { name: 'حي 40 هكتار',             lat: 35.3780, lng: 1.3200 },
  { name: 'حي لادم',                 lat: 35.3620, lng: 1.3100 },
  { name: 'حي 100 سكن',              lat: 35.3655, lng: 1.3255 },
  { name: 'حي 192 سكن',              lat: 35.3765, lng: 1.3155 },
  { name: 'حي السعادة',              lat: 35.3695, lng: 1.3355 },
  { name: 'حي الطلبة',               lat: 35.3670, lng: 1.3210 },
];

const ADMIN = [
  { name: 'مقر الولاية تيارت',            lat: 35.3710, lng: 1.3170 },
  { name: 'مستشفى يوسف دمردجي',           lat: 35.3839, lng: 1.3147 },
  { name: 'ملعب أحمد قايد',               lat: 35.3619, lng: 1.3312 },
  { name: 'جامعة تيارت ابن خلدون',        lat: 35.3680, lng: 1.3195 },
  { name: 'مستشفى كرمان',                 lat: 35.3680, lng: 1.3500 },
  { name: 'مستشفى الأمومة والطفولة',       lat: 35.3500, lng: 1.3300 },
  { name: 'المعهد الوطني INFSPM',          lat: 35.3840, lng: 1.3150 },
  { name: 'محطة المسافرين البرية',         lat: 35.3600, lng: 1.3150 },
  { name: 'بارك التسلية',                 lat: 35.3850, lng: 1.3100 },
  { name: 'حديقة رستم',                   lat: 35.3830, lng: 1.3050 },
  { name: 'غابة سيدي محمد',               lat: 35.3700, lng: 1.2900 },
  { name: 'فندق بوعزة',                   lat: 35.3650, lng: 1.3200 },
  { name: 'مقر الدائرة تيارت',            lat: 35.3715, lng: 1.3190 },
  { name: 'محكمة تيارت',                  lat: 35.3725, lng: 1.3210 },
  { name: 'الضرائب (Les Impôts)',         lat: 35.3705, lng: 1.3230 },
  { name: 'بريد الجزائر - المقر الرئيسي', lat: 35.3712, lng: 1.3168 },
  { name: 'قاعة الحفلات تاج المحل',       lat: 35.3745, lng: 1.3300 },
];

const HIGHSCHOOLS = [
  { name: 'ثانوية أيت عمران آمنة',   lat: 35.3705, lng: 1.3150 },
  { name: 'ثانوية بكر بن حماد',      lat: 35.3690, lng: 1.3200 },
  { name: 'ثانوية ابن رستم',         lat: 35.3650, lng: 1.3180 },
  { name: 'ثانوية كرمان الجديدة',    lat: 35.3725, lng: 1.3160 },
  { name: 'ثانوية قاديري خالد',      lat: 35.3680, lng: 1.3190 },
  { name: 'ثانوية باقي الطيب',       lat: 35.3710, lng: 1.3100 },
  { name: 'ثانوية عماري عبد القادر', lat: 35.3695, lng: 1.3110 },
  { name: 'ثانوية عفان الطاهر',      lat: 35.3730, lng: 1.3130 },
  { name: 'ثانوية حيرش محمد',        lat: 35.3700, lng: 1.3250 },
  { name: 'ثانوية زايش عبد القادر',  lat: 35.3670, lng: 1.3250 },
  { name: 'ثانوية محمد عصامي',       lat: 35.3770, lng: 1.3100 },
  { name: 'ثانوية بلحرش السعيد',     lat: 35.3640, lng: 1.3200 },
];

const PRIMARYSCHOOLS = [
  { name: 'ابتدائية بن فريحة أمحمد',    lat: 35.3675, lng: 1.3120 },
  { name: 'ابتدائية الإمام عبد الوهاب', lat: 35.3725, lng: 1.3185 },
  { name: 'ابتدائية بن ستيرة جيلالي',   lat: 35.3750, lng: 1.3200 },
  { name: 'ابتدائية كاتبي أمحمد',       lat: 35.3690, lng: 1.3175 },
  { name: 'ابتدائية السنيا الجديدة',    lat: 35.3740, lng: 1.3210 },
  { name: 'ابتدائية سيدي خالد',         lat: 35.3645, lng: 1.3290 },
  { name: 'ابتدائية ديار الشمس',        lat: 35.3718, lng: 1.3178 },
  { name: 'ابتدائية حي كارمان',         lat: 35.3688, lng: 1.3145 },
  { name: 'ابتدائية 1 نوفمبر',          lat: 35.3720, lng: 1.3120 },
  { name: 'ابتدائية بوعلام بن حمودة',   lat: 35.3660, lng: 1.3180 },
];

const MOSQUES = [
  { name: 'جامع تيارت الكبير',          lat: 35.3700, lng: 1.3160 },
  { name: 'مسجد الرحمة',               lat: 35.3695, lng: 1.3145 },
  { name: 'مسجد الأرقم بن أبي الأرقم', lat: 35.3715, lng: 1.3130 },
  { name: 'مسجد صلاح الدين الأيوبي',   lat: 35.3680, lng: 1.3190 },
  { name: 'مسجد البدر',                lat: 35.3708, lng: 1.3172 },
  { name: 'مسجد سيدي خالد',            lat: 35.3655, lng: 1.3285 },
  { name: 'مسجد الهدى',               lat: 35.3665, lng: 1.3280 },
  { name: 'مسجد الفتح',                lat: 35.3690, lng: 1.3270 },
  { name: 'مسجد عقبة بن نافع',         lat: 35.3755, lng: 1.3250 },
];

// ── Zoom tracker ─────────────────────────────────────────────────────────────
function ZoomTracker({ onZoom }) {
  const map = useMap();
  useEffect(() => { onZoom(map.getZoom()); }, []);
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) });
  return null;
}

// ── Landmark Marker (tooltip only at zoom ≥ 15) ──────────────────────────────
function LandmarkMarker({ pos, name, icon, zoom }) {
  return (
    <Marker position={pos} icon={icon}>
      {zoom >= 15 && (
        <Tooltip
          permanent
          direction="top"
          offset={[0, -10]}
          className="gmaps-tooltip"
        >
          {name}
        </Tooltip>
      )}
      <Popup>
        <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif", fontWeight: 600, fontSize: 13 }}>
          {name}
        </div>
      </Popup>
    </Marker>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center]);
  return null;
}

function MapClickEvents({ onClick }) {
  useMapEvents({ click: (e) => { if (onClick) onClick(e.latlng); } });
  return null;
}

// ── Main Component ───────────────────────────────────────────────────────────
const Map = ({ onMapClick, destination }) => {
  const [position, setPosition] = useState([35.371, 1.317]);
  const [drivers, setDrivers]   = useState([]);
  const [zoom, setZoom]         = useState(14);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
        ()    => console.warn('Geolocation unavailable, using Tiaret center')
      );
    }
    try {
      const unsub = listenToAvailableDrivers(setDrivers);
      return () => unsub();
    } catch (e) {
      console.warn('Firebase unavailable', e);
    }
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <MapContainer
        center={position}
        zoom={14}
        minZoom={12}
        maxZoom={19}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <ZoomTracker onZoom={setZoom} />
        <ChangeView center={position} />
        <MapClickEvents onClick={onMapClick} />

        {/* ── CartoDB Voyager — أقرب لـ Google Maps (أبيض + طرق زرقاء رمادية) ── */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &amp; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          maxZoom={19}
          minZoom={12}
        />

        {/* ── 5 Layers ── */}
        <LayersControl position="topright" collapsed={false}>

          {/* 🏘️ الأحياء — مفعّلة افتراضياً */}
          <LayersControl.Overlay checked name="🏘️ الأحياء">
            <LayerGroup>
              {NEIGHBORHOODS.map((loc, i) => (
                <LandmarkMarker key={`nh-${i}`} pos={[loc.lat, loc.lng]}
                  name={loc.name} icon={ICONS.neighborhood} zoom={zoom} />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          {/* 🏛️ الإدارات — مفعّلة افتراضياً */}
          <LayersControl.Overlay checked name="🏛️ الإدارات والمرافق">
            <LayerGroup>
              {ADMIN.map((loc, i) => (
                <LandmarkMarker key={`ad-${i}`} pos={[loc.lat, loc.lng]}
                  name={loc.name} icon={ICONS.admin} zoom={zoom} />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          {/* 📚 الثانويات — مخفية افتراضياً */}
          <LayersControl.Overlay name="📚 الثانويات">
            <LayerGroup>
              {HIGHSCHOOLS.map((loc, i) => (
                <LandmarkMarker key={`hs-${i}`} pos={[loc.lat, loc.lng]}
                  name={loc.name} icon={ICONS.highschool} zoom={zoom} />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          {/* 📖 الابتدائيات — مخفية افتراضياً */}
          <LayersControl.Overlay name="📖 الابتدائيات">
            <LayerGroup>
              {PRIMARYSCHOOLS.map((loc, i) => (
                <LandmarkMarker key={`ps-${i}`} pos={[loc.lat, loc.lng]}
                  name={loc.name} icon={ICONS.primary} zoom={zoom} />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          {/* 🕌 المساجد — مخفية افتراضياً */}
          <LayersControl.Overlay name="🕌 المساجد">
            <LayerGroup>
              {MOSQUES.map((loc, i) => (
                <LandmarkMarker key={`ms-${i}`} pos={[loc.lat, loc.lng]}
                  name={loc.name} icon={ICONS.mosque} zoom={zoom} />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

        </LayersControl>

        {/* ── موقع المستخدم ── */}
        <Marker position={position} icon={ICONS.user}>
          <Popup><div style={{ direction: 'rtl' }}>📍 أنت هنا</div></Popup>
        </Marker>

        {/* ── الوجهة المختارة ── */}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={ICONS.destination}>
            <Popup><div style={{ direction: 'rtl' }}>🎯 الوجهة المختارة</div></Popup>
          </Marker>
        )}

        {/* ── السائقون بالوقت الفعلي ── */}
        {drivers.map(driver =>
          driver.location && (
            <Marker key={driver.id} position={[driver.location.lat, driver.location.lng]} icon={ICONS.driver}>
              <Popup>
                <div style={{ direction: 'rtl' }}>
                  🚗 {driver.name || driver.id}<br />
                  {driver.vehicle || 'سيارة عادية'}
                </div>
              </Popup>
            </Marker>
          )
        )}

      </MapContainer>
    </div>
  );
};

export default Map;
