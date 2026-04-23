'use client';

import { useState, useEffect } from 'react';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';

type PersonRecord = {
  _id: string;
  externalId?: string;
  status: string;
  fullName: string;
  dob?: string;
  callsign?: string;
  unit?: string;
  dateOfEvent?: string;
  locationOfEvent?: string;
  isApproved?: boolean;
};

export default function SearchPage() {
  const [data, setData] = useState<PersonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionRole, setSessionRole] = useState('');

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [unit, setUnit] = useState('');
  const [location, setLocation] = useState('');
  const [dobStart, setDobStart] = useState('');
  const [dobEnd, setDobEnd] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [showFilters, setShowFilters] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  // Captcha state
  const [captcha, setCaptcha] = useState({ a: 0, b: 0, answer: 0, input: '', solved: false });

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ a, b, answer: a + b, input: '', solved: false });
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (status) params.append('status', status);
      if (unit) params.append('unit', unit);
      if (location) params.append('location', location);
      if (dobStart) params.append('dobStart', dobStart);
      if (dobEnd) params.append('dobEnd', dobEnd);
      if (dateStart) params.append('dateStart', dateStart);
      if (dateEnd) params.append('dateEnd', dateEnd);
      params.append('sortField', sortField);
      params.append('sortOrder', sortOrder);
      params.append('page', page.toString());
      params.append('limit', '50');

      const res = await fetch(`/api/persons?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();

      setData(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalRecords(json.pagination?.total || 0);
      setIsGuest(json.isGuest);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d?.role) {
          setSessionRole(d.role);
          setCaptcha({ ...captcha, solved: true }); // Automatically solve for logged in
        } else {
          setSessionRole('GUEST');
          generateCaptcha();
        }
        setSessionChecked(true);
      })
      .catch(() => {
        setSessionRole('GUEST');
        generateCaptcha();
        setSessionChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!sessionChecked || !captcha.solved) return;
    const t = setTimeout(() => fetchResults(), 400);
    return () => clearTimeout(t);
  }, [query, status, unit, location, dobStart, dobEnd, dateStart, dateEnd, sortField, sortOrder, page, sessionChecked, captcha.solved]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc'
      ? <ArrowUp size={12} style={{ marginLeft: 2 }} />
      : <ArrowDown size={12} style={{ marginLeft: 2 }} />;
  };

  const statusText = (s: string) => {
    switch (s) {
      case 'KILLED': return 'Загинув';
      case 'MISSING': return 'Зниклий';
      case 'CAPTURED': return 'Полонений';
      default: return 'Невідомо';
    }
  };

  if (!sessionChecked) {
    return <div className="page"><p>Перевірка доступу...</p></div>;
  }

  if (!captcha.solved) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text)' }}>Перевірка безпеки</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '20px', fontSize: '14px' }}>
            Щоб продовжити пошук, будь ласка, розв'яжіть простий приклад:
          </p>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', letterSpacing: '2px' }}>
            {captcha.a} + {captcha.b} = ?
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (parseInt(captcha.input) === captcha.answer) {
              setCaptcha({ ...captcha, solved: true });
            } else {
              alert('Невірна відповідь, спробуйте ще раз.');
              generateCaptcha();
            }
          }}>
            <input 
              type="number" 
              value={captcha.input}
              onChange={e => setCaptcha({ ...captcha, input: e.target.value })}
              style={{ padding: '10px', fontSize: '18px', width: '100px', textAlign: 'center', marginBottom: '16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              autoFocus
            />
            <button type="submit" style={{ display: 'block', width: '100%', padding: '12px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
              Підтвердити
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">

      {/* Search row */}
      <div className="search-row">
        <div className="search-field">
          <Search size={14} />
          <input
            type="text"
            placeholder="Пошук за прізвищем, позивним..."
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
          />
        </div>
        <select className="filter" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Всі статуси</option>
          <option value="KILLED">Загинув</option>
          <option value="MISSING">Зниклий</option>
          <option value="CAPTURED">Полонений</option>
        </select>
        <button onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? 'Сховати фільтри' : 'Фільтри'}
        </button>

      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="field-group">
              <label>Підрозділ</label>
              <input type="text" value={unit} onChange={e => { setUnit(e.target.value); setPage(1); }} />
            </div>
            <div className="field-group">
              <label>Місце події</label>
              <input type="text" value={location} onChange={e => { setLocation(e.target.value); setPage(1); }} />
            </div>
            <div className="field-group">
              <label>Дата народження</label>
              <div className="date-range">
                <input type="date" value={dobStart} onChange={e => { setDobStart(e.target.value); setPage(1); }} />
                <input type="date" value={dobEnd} onChange={e => { setDobEnd(e.target.value); setPage(1); }} />
              </div>
            </div>
            <div className="field-group">
              <label>Дата події</label>
              <div className="date-range">
                <input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setPage(1); }} />
                <input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setPage(1); }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <span className="count">
            Знайдено: {totalRecords}
            {sessionRole && (
              <span className="guest-tag">
                {sessionRole === 'ADMIN' ? 'адмін' : 
                 sessionRole === 'MODERATOR' ? 'модератор' : 
                 sessionRole === 'USER' ? 'користувач' : 'гість'}
              </span>
            )}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('status')}>Статус <SortIcon field="status" /></th>
                <th onClick={() => handleSort('fullName')}>ПІБ <SortIcon field="fullName" /></th>
                <th onClick={() => handleSort('dobParsed')}>Дата нар. <SortIcon field="dobParsed" /></th>
                <th onClick={() => handleSort('unit')}>Підрозділ <SortIcon field="unit" /></th>
                <th onClick={() => handleSort('dateOfEventParsed')}>Дата події <SortIcon field="dateOfEventParsed" /></th>
                <th onClick={() => handleSort('locationOfEvent')}>Місце <SortIcon field="locationOfEvent" /></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(12).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j}><div className="skel" style={{ height: 16, width: 60 + j * 20 }}></div></td>
                    ))}
                  </tr>
                ))
              ) : data.length > 0 ? (
                data.map((p: PersonRecord) => (
                  <tr key={p._id}>
                    <td>
                      <span className={`status status-${p.status.toLowerCase()}`}>{statusText(p.status)}</span>
                      {p.isApproved === false && <span style={{fontSize: '11px', color: 'var(--yellow)', display: 'block', marginTop: '2px'}}>На модерації</span>}
                    </td>
                    <td className="name">
                      <Link href={`/record/${p._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {p.fullName}
                      </Link>
                      {p.callsign && <span className="callsign">«{p.callsign}»</span>}
                    </td>
                    <td>{p.dob || '—'}</td>
                    <td>{p.unit || '—'}</td>
                    <td>{p.dateOfEvent || '—'}</td>
                    <td>{p.locationOfEvent || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      <Search size={32} />
                      <h3>Нічого не знайдено</h3>
                      <p>Змініть параметри пошуку</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="pagination-row">
            <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>←</button>
            <span>{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}
