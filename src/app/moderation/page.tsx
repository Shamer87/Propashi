'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ModerationPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d || (d.role !== 'ADMIN' && d.role !== 'MODERATOR')) {
          window.location.href = '/login';
        } else {
          loadPending();
        }
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  const loadPending = async () => {
    try {
      const res = await fetch('/api/persons?isApproved=false&sortField=createdAt&sortOrder=desc&limit=100');
      if (!res.ok) throw new Error('Помилка завантаження');
      const json = await res.json();
      setData(json.data || []);
    } catch {
      setError('Не вдалося завантажити анкети');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/persons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: true })
      });
      if (res.ok) {
        setData(prev => prev.filter(p => p._id !== id));
      }
    } catch {}
  };

  const handleReject = async (id: string) => {
    if (!confirm('Видалити цю анкету?')) return;
    try {
      const res = await fetch(`/api/persons/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setData(prev => prev.filter(p => p._id !== id));
      }
    } catch {}
  };

  const statusText = (s: string) => {
    switch (s) {
      case 'KILLED': return 'Загинув';
      case 'MISSING': return 'Зниклий';
      case 'CAPTURED': return 'Полонений';
      default: return 'Невідомо';
    }
  };

  const fmtDate = (d: string) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('uk-UA');
  };

  if (loading) return <div className="page"><p>Завантаження...</p></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="page-title">Модерація анкет</h1>
        <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{data.length} на розгляді</span>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {data.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>Нових анкет на модерацію немає</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Статус</th>
                <th>ПІБ</th>
                <th>Дата нар.</th>
                <th>Підрозділ</th>
                <th>Створено</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {data.map(p => (
                <tr key={p._id}>
                  <td><span className={`status status-${p.status?.toLowerCase()}`}>{statusText(p.status)}</span></td>
                  <td className="name">
                    <Link href={`/record/${p._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {p.fullName}
                    </Link>
                    {p.callsign && <span className="callsign">«{p.callsign}»</span>}
                  </td>
                  <td>{p.dob || '—'}</td>
                  <td>{p.unit || '—'}</td>
                  <td>{fmtDate(p.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleApprove(p._id)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          background: 'rgba(34,197,94,0.15)',
                          color: '#22c55e',
                          border: '1px solid rgba(34,197,94,0.3)',
                          cursor: 'pointer',
                        }}
                      >
                        Затвердити
                      </button>
                      <button
                        onClick={() => handleReject(p._id)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          background: 'rgba(239,68,68,0.15)',
                          color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.3)',
                          cursor: 'pointer',
                        }}
                      >
                        Видалити
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
