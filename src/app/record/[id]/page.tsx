'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
export default function RecordPage() {
  const { id } = useParams();
  const [record, setRecord] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState<any>({});
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [userRole, setUserRole] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d?.role) setUserRole(d.role);
      })
      .catch(() => {});
    fetch(`/api/persons/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) {
          setMsg(json.error);
        } else {
          setRecord(json.data);
          setForm({
            ...json.data
          });
          setIsGuest(json.isGuest);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);
  const statusText = (s: string) => {
    switch (s) {
      case 'KILLED': return 'Загинув';
      case 'MISSING': return 'Зниклий';
      case 'CAPTURED': return 'Полонений';
      default: return 'Невідомо';
    }
  };
  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    const payload: any = { ...form };
    try {
      const res = await fetch(`/api/persons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        setRecord(json.data);
        setForm(json.data);
        setEditing(false);
        setMsg('Збережено.');
      } else {
        const json = await res.json();
        setMsg(json.error || 'Помилка');
      }
    } catch {
      setMsg('Збій');
    } finally {
      setSaving(false);
    }
  };
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) fd.append('photos', files[i]);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.photos) {
        setForm((prev: any) => ({ ...prev, photos: [...(prev.photos || []), ...json.photos] }));
      }
    } catch { }
    finally {
      setUploadingPhotos(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const removePhoto = (index: number) => {
    setForm((prev: any) => ({ ...prev, photos: (prev.photos || []).filter((_: any, i: number) => i !== index) }));
  };
  if (loading) return <div className="page"><p style={{ color: 'var(--text-dim)' }}>Завантаження...</p></div>;
  if (!record) return <div className="page"><p style={{ color: 'var(--text-dim)' }}>{msg || 'Запис не знайдено.'}</p></div>;
  const Row = ({ label, value }: { label: string, value?: string }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
      <div style={{ width: '180px', flexShrink: 0, color: 'var(--text-dim)', fontSize: '13px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: 'var(--text)' }}>{value || '—'}</div>
    </div>
  );
  if (!editing) {
    return (
      <div className="page" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{record.fullName}</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className={`status status-${record.status?.toLowerCase()}`} style={{ fontSize: '13px' }}>
              {statusText(record.status)}
            </span>
            {!record.isApproved && <span className="guest-tag">На модерації</span>}
            {!isGuest && <button onClick={() => setEditing(true)}>Редагувати</button>}
          </div>
        </div>
        {msg && <div className="success-msg">{msg}</div>}
        {}
        {!record.isApproved && (userRole === 'ADMIN' || userRole === 'MODERATOR') && (
          <div style={{
            display: 'flex',
            gap: '10px',
            padding: '14px 20px',
            marginBottom: '20px',
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-dim)', marginRight: 'auto' }}>Ця анкета очікує на модерацію</span>
            <button
              onClick={async () => {
                const res = await fetch(`/api/persons/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ isApproved: true })
                });
                if (res.ok) {
                  setRecord({ ...record, isApproved: true });
                  setMsg('Анкету затверджено.');
                }
              }}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                background: 'rgba(34,197,94,0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.3)',
                cursor: 'pointer',
              }}
            >
              Затвердити
            </button>
            <button
              onClick={async () => {
                if (!confirm('Видалити цю анкету?')) return;
                const res = await fetch(`/api/persons/${id}`, { method: 'DELETE' });
                if (res.ok) {
                  window.location.href = '/moderation';
                }
              }}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                background: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
                cursor: 'pointer',
              }}
            >
              Видалити
            </button>
          </div>
        )}
        <div style={{ border: '1px solid var(--border)', padding: '16px 20px', marginBottom: '20px' }}>
          <Row label="ПІБ" value={record.fullName} />
          <Row label="Статус" value={statusText(record.status)} />
          <Row label="Дата народження" value={record.dob} />
          <Row label="Позивний / Жетон" value={record.callsign} />
          <Row label="Підрозділ" value={record.unit} />
          <Row label="Дата події" value={record.dateOfEvent} />
          <Row label="Місце події" value={record.locationOfEvent} />
          {record.coordinates?.lat && <Row label="Координати" value={`${record.coordinates.lat}, ${record.coordinates.lng}`} />}
          <Row label="Місце проживання" value={record.placeOfResidence} />
          <Row label="Особливі прикмети" value={record.specialFeatures} />
          <Row label="Додаткова інформація" value={record.extraInfo} />
          <Row label="В базі з" value={record.createdAt ? new Date(record.createdAt).toLocaleDateString('uk-UA') : undefined} />
          <Row label="Оновлено" value={record.updatedAt ? new Date(record.updatedAt).toLocaleDateString('uk-UA') : undefined} />
        </div>
        {}
        {record.photos && record.photos.length > 0 && (
          <div style={{ border: '1px solid var(--border)', padding: '16px 20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>Фотографії ({record.photos.length})</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {record.photos.map((p: string, i: number) => (
                <img key={i} src={p} alt="" style={{ width: '120px', height: '120px', objectFit: 'cover', border: '1px solid var(--border)' }} />
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: '20px' }}>
          <a href="/search" style={{ fontSize: '13px' }}>← Назад до пошуку</a>
        </div>
      </div>
    );
  }
  return (
    <div className="form-page">
      <div className="form-box">
        <h2>Редагування запису</h2>
        <p className="desc">Зміни зберігаються одразу після натискання «Зберегти».</p>
        {msg && <div className="error-msg">{msg}</div>}
        <div className="form-cols">
          <div className="form-field">
            <label>ПІБ *</label>
            <input type="text" value={form.fullName || ''} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="form-field">
            <label>Статус</label>
            <select value={form.status || 'UNKNOWN'} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="UNKNOWN">Невідомо</option>
              <option value="KILLED">Загинув</option>
              <option value="MISSING">Зниклий</option>
              <option value="CAPTURED">Полонений</option>
            </select>
          </div>
        </div>
        <div className="form-cols">
          <div className="form-field">
            <label>Дата народження</label>
            <input type="text" value={form.dob || ''} onChange={e => setForm({ ...form, dob: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Позивний / Жетон</label>
            <input type="text" value={form.callsign || ''} onChange={e => setForm({ ...form, callsign: e.target.value })} />
          </div>
        </div>
        <div className="form-field">
          <label>Підрозділ</label>
          <input type="text" value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })} />
        </div>
        <div className="form-cols">
          <div className="form-field">
            <label>Дата події</label>
            <input type="text" value={form.dateOfEvent || ''} onChange={e => setForm({ ...form, dateOfEvent: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Місце події</label>
            <input type="text" value={form.locationOfEvent || ''} onChange={e => setForm({ ...form, locationOfEvent: e.target.value })} />
          </div>
        </div>
        <div className="form-field">
          <label>Місце проживання</label>
          <input type="text" value={form.placeOfResidence || ''} onChange={e => setForm({ ...form, placeOfResidence: e.target.value })} />
        </div>
        <div className="form-field">
          <label>Особливі прикмети</label>
          <textarea value={form.specialFeatures || ''} onChange={e => setForm({ ...form, specialFeatures: e.target.value })}></textarea>
        </div>
        <div className="form-field">
          <label>Фотографії</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: (form.photos || []).length > 0 ? '12px' : '0' }}>
            {(form.photos || []).map((p: string, i: number) => (
              <div key={i} style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, padding: 0, fontSize: '11px', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >✕</button>
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*,.heic,.png" multiple onChange={handlePhotoUpload} style={{ fontSize: '13px' }} />
          {uploadingPhotos && <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '8px' }}>Завантаження...</span>}
        </div>
        <div className="form-field">
          <label>Додаткова інформація</label>
          <textarea value={form.extraInfo || ''} onChange={e => setForm({ ...form, extraInfo: e.target.value })}></textarea>
        </div>
        {(userRole === 'ADMIN' || userRole === 'MODERATOR') && (
          <div className="form-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none' }}>
              <input type="checkbox" checked={form.isApproved || false} onChange={e => setForm({ ...form, isApproved: e.target.checked })} />
              Затверджено (видно у пошуку)
            </label>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Збереження...' : 'Зберегти'}
          </button>
          <button onClick={() => { setEditing(false); setForm(record); setMsg(''); }}>
            Скасувати
          </button>
        </div>
      </div>
    </div>
  );
}