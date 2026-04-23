'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';

// Dynamically import MapComponent with SSR disabled
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function MapPage() {
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  // Fetch data
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: '2000', // Load up to 2000 points on map
      hasCoordinates: 'true'
    });
    if (query) params.append('query', query);
    if (status) params.append('status', status);

    fetch(`/api/persons?${params.toString()}`)
      .then(res => res.json())
      .then(d => {
        if (d.data) setPersons(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [query, status]);

  return (
    <div className="page" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', padding: '16px' }}>
      <h1 className="page-title" style={{ marginBottom: '16px' }}>Карта локацій</h1>

      <div className="search-row" style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div className="search-field">
          <Search size={14} />
          <input
            type="text"
            placeholder="Пошук за прізвищем, позивним..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <select className="filter" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Всі статуси</option>
          <option value="KILLED">Загинув</option>
          <option value="MISSING">Зниклий</option>
          <option value="CAPTURED">Полонений</option>
        </select>
        <span style={{ fontSize: '13px', color: 'var(--text-dim)', alignSelf: 'center', marginLeft: 'auto' }}>
          Знайдено з координатами: {persons.filter(p => p.coordinates?.lat).length}
        </span>
      </div>

      <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
        {loading ? (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-dim)' }}>
            Завантаження карти...
          </div>
        ) : (
          <MapComponent persons={persons} />
        )}
      </div>
    </div>
  );
}
