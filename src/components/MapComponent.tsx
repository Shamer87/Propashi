'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import * as L from 'leaflet';
import 'leaflet-defaulticon-compatibility';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { PersonRecord } from '@/app/search/page'; 
import Link from 'next/link';
interface MapProps {
  persons: any[];
}
const statusText = (s: string) => {
  switch (s) {
    case 'KILLED': return 'Загинув';
    case 'MISSING': return 'Зниклий';
    case 'CAPTURED': return 'Полонений';
    default: return 'Невідомо';
  }
};
export default function MapComponent({ persons }: MapProps) {
  const defaultCenter: [number, number] = [48.3794, 31.1656];
  return (
    <MapContainer center={defaultCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading>
        {persons.map(p => {
          if (!p.coordinates?.lat || !p.coordinates?.lng) return null;
          return (
            <Marker key={p._id} position={[p.coordinates.lat, p.coordinates.lng]}>
              <Popup>
                <div style={{ padding: '4px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                    <Link href={`/record/${p._id}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                      {p.fullName}
                    </Link>
                  </strong>
                  <div style={{ marginBottom: '4px', fontSize: '13px' }}>
                    Статус: <span className={`status status-${p.status.toLowerCase()}`}>{statusText(p.status)}</span>
                  </div>
                  {p.callsign && <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Позивний: {p.callsign}</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}