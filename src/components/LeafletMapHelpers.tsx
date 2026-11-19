import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngTuple } from '../types/smartpool';

/**
 * 100% Free, Zero-API-Key Tile Providers (Verified clean, zero watermarks):
 * 1. OpenStreetMap Standard — works with strict-origin-when-cross-origin Referrer
 * 2. Esri World Street Map — crisp English labels, works everywhere including Capacitor Android WebViews with zero API key
 */
export const TILE_PROVIDERS = {
  osm: {
    id: 'osm' as const,
    label: 'OSM',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  esri: {
    id: 'esri' as const,
    label: 'Street HD',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, OpenStreetMap contributors',
    maxZoom: 19,
  },
};

export type MapStyleId = keyof typeof TILE_PROVIDERS;

/**
 * Drop-in Zero-API-Key TileLayer with automatic failover to Esri World Street Map
 * if a restricted WebView or network blocks tile.openstreetmap.org, plus optional style switcher.
 */
export const KarachiTileLayer: React.FC<{
  preferredStyle?: MapStyleId;
  showStyleToggle?: boolean;
}> = ({ preferredStyle = 'esri', showStyleToggle = true }) => {
  const [style, setStyle] = useState<MapStyleId>(preferredStyle);
  const errorCountRef = useRef<number>(0);

  const active = TILE_PROVIDERS[style];

  return (
    <>
      <TileLayer
        key={active.id}
        url={active.url}
        attribution={active.attribution}
        maxZoom={active.maxZoom}
        eventHandlers={{
          tileerror: () => {
            errorCountRef.current += 1;
            if (errorCountRef.current >= 2 && style === 'osm') {
              errorCountRef.current = 0;
              setStyle('esri');
            } else if (errorCountRef.current >= 2 && style === 'esri') {
              errorCountRef.current = 0;
              setStyle('osm');
            }
          },
          tileload: () => {
            errorCountRef.current = 0;
          },
        }}
      />
      {showStyleToggle && (
        <div
          className="leaflet-bottom leaflet-left"
          style={{ pointerEvents: 'auto', marginBottom: 8, marginLeft: 8 }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              errorCountRef.current = 0;
              setStyle((prev) => (prev === 'esri' ? 'osm' : 'esri'));
            }}
            title="Switch free map tile layer (Zero API Key)"
            style={{
              background: 'rgba(255,255,255,0.94)',
              color: '#0A192F',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 800,
              boxShadow: '0 2px 6px rgba(0,0,0,0.14)',
              cursor: 'pointer',
            }}
          >
            Map: {active.label === 'Street HD' ? 'Street HD' : 'OSM'} ⇄
          </button>
        </div>
      )}
    </>
  );
};

/**
 * Ensures Leaflet maps recalculate tile dimensions smoothly when tabs/modals switch
 */
export const MapAutoResize: React.FC<{ triggerKey?: string | number | boolean }> = ({
  triggerKey,
}) => {
  const map = useMap();
  useEffect(() => {
    const t1 = window.setTimeout(() => map.invalidateSize(), 60);
    const t2 = window.setTimeout(() => map.invalidateSize(), 260);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [map, triggerKey]);
  return null;
};

/**
 * Smoothly fits or centers map onto a target coordinate / bounds
 */
export const MapFocusController: React.FC<{
  center?: LatLngTuple;
  zoom?: number;
  bounds?: LatLngTuple[];
  focusKey: string;
}> = ({ center, zoom = 15, bounds, focusKey }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
    } else if (center) {
      map.setView(center, zoom, { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focusKey]);
  return null;
};

/**
 * Allows passenger to tap any inner street ("Gali") to dynamically relocate their home pin
 */
export const MapClickCatcher: React.FC<{
  enabled: boolean;
  onPick: (coords: LatLngTuple) => void;
}> = ({ enabled, onPick }) => {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

/**
 * Custom crisp SVG/HTML Leaflet DivIcons (zero broken image assets)
 */
export function createMeetingPointIcon(): L.DivIcon {
  return L.divIcon({
    className: 'sp-custom-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20],
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        <span style="position:absolute;width:38px;height:38px;border-radius:9999px;background:rgba(16,185,129,0.35);animation:pulseRing 1.8s infinite;"></span>
        <div style="position:relative;width:30px;height:30px;border-radius:9999px;background:linear-gradient(135deg,#10b981,#059669);border:3px solid #ffffff;box-shadow:0 6px 14px rgba(5,150,105,0.5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px;">
          AI
        </div>
      </div>
    `,
  });
}

export function createHomeGaliIcon(): L.DivIcon {
  return L.divIcon({
    className: 'sp-custom-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
    html: `
      <div style="width:32px;height:32px;border-radius:10px;background:#0a192f;border:2.5px solid #ffffff;box-shadow:0 6px 14px rgba(10,25,47,0.4);display:flex;align-items:center;justify-content:center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/>
        </svg>
      </div>
    `,
  });
}

export function createLiveVehicleIcon(isFemalePool = false): L.DivIcon {
  const accent = isFemalePool ? '#ec4899' : '#10b981';
  return L.divIcon({
    className: 'sp-custom-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -18],
    html: `
      <div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center;">
        <span style="position:absolute;width:36px;height:36px;border-radius:9999px;background:${accent}44;animation:pulseRing 1.6s infinite;"></span>
        <div style="position:relative;width:32px;height:32px;border-radius:9999px;background:#0a192f;border:2.5px solid ${accent};box-shadow:0 6px 16px rgba(10,25,47,0.5);display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.3-4.6A2 2 0 0 0 13.9 4H10a2 2 0 0 0-1.8 1.1L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
      </div>
    `,
  });
}

export function createEndpointIcon(type: 'origin' | 'destination', shortText?: string): L.DivIcon {
  const bg = type === 'origin' ? '#0f172a' : '#059669';
  const glyph = shortText ?? (type === 'origin' ? 'A' : 'B');
  return L.divIcon({
    className: 'sp-custom-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12],
    html: `
      <div style="width:26px;height:26px;border-radius:9999px;background:${bg};border:2.5px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.3);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;">
        ${glyph}
      </div>
    `,
  });
}

export function createLandmarkBadgeIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: 'sp-custom-marker',
    iconSize: [110, 24],
    iconAnchor: [55, 12],
    html: `
      <div style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:9999px;background:rgba(10,25,47,0.88);color:#fff;font-size:9.5px;font-weight:700;white-space:nowrap;border:1px solid rgba(16,185,129,0.5);box-shadow:0 3px 8px rgba(0,0,0,0.22);">
        <span style="width:6px;height:6px;border-radius:9999px;background:#10b981;"></span>
        ${label}
      </div>
    `,
  });
}
