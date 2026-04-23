'use client';

import { useState, useEffect, useRef } from 'react';

type MatchRecord = {
  _id: string;
  fullName: string;
  status: string;
  dob?: string;
  unit?: string;
  dateOfEvent?: string;
  locationOfEvent?: string;
};

export default function SubmitPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    status: 'UNKNOWN',
    dob: '',
    callsign: '',
    unit: '',
    dateOfEvent: '',
    locationOfEvent: '',
    placeOfResidence: '',
    specialFeatures: '',
    extraInfo: ''
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Validation helpers ──────────────────────────────────────────────
  const validateFullName = (v: string) => {
    if (!v.trim()) return 'ПІБ є обов\'язковим полем';
    if (v.trim().length < 3) return 'ПІБ має містити щонайменше 3 символи';
    if (!/^[\p{L}\s.\-']+$/u.test(v.trim())) return 'ПІБ може містити лише літери, пробіли, дефіси та апострофи';
    return '';
  };

  const validateDate = (v: string, label: string) => {
    if (!v.trim()) return ''; // optional
    // Accept flexible formats: DD.MM.YYYY, YYYY, DD/MM/YYYY, DD-MM-YYYY
    if (!/^(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}|\d{4}|\d{1,2}[.\-/]\d{4})$/.test(v.trim())) {
      return `${label}: невірний формат (приклад: 15.03.1990 або 1990)`;
    }
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameErr = validateFullName(formData.fullName);
    if (nameErr) newErrors.fullName = nameErr;

    const dobErr = validateDate(formData.dob, 'Дата народження');
    if (dobErr) newErrors.dob = dobErr;

    const dateErr = validateDate(formData.dateOfEvent, 'Дата події');
    if (dateErr) newErrors.dateOfEvent = dateErr;

    if (formData.callsign && formData.callsign.length > 100) {
      newErrors.callsign = 'Позивний занадто довгий (макс. 100 символів)';
    }

    if (formData.unit && formData.unit.length > 200) {
      newErrors.unit = 'Назва підрозділу занадто довга (макс. 200 символів)';
    }

    if (formData.extraInfo && formData.extraInfo.length > 5000) {
      newErrors.extraInfo = 'Додаткова інформація занадто довга (макс. 5000 символів)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Matching
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d || !d.role) {
          window.location.href = '/login';
        } else {
          setSessionChecked(true);
        }
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    const name = formData.fullName.trim();
    if (name.length < 3) { setMatches([]); return; }

    setMatchLoading(true);
    fetch(`/api/persons/match?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) setMatches(d.data);
      })
      .catch(() => {})
      .finally(() => setMatchLoading(false));
  }, [formData.fullName, sessionChecked]);

  const statusText = (s: string) => {
    switch (s) {
      case 'KILLED': return 'Загинув';
      case 'MISSING': return 'Зниклий';
      case 'CAPTURED': return 'Полонений';
      default: return 'Невідомо';
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];
    
    // Validate file types and sizes
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      const isValidExtension = supportedExtensions.includes(ext);
      const isValidMime = supportedFormats.includes(file.type) || file.type.includes('image');
      
      if (!isValidExtension && !isValidMime) {
        setMessage({ type: 'error', text: `Файл ${file.name}: невідомий формат. Використовуйте JPG, PNG або HEIC.` });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: `Файл ${file.name}: розмір більше 5 МБ.` });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setUploadingPhotos(true);
    setMessage(null);
    
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) {
      fd.append('photos', files[i]);
    }

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.error) {
        setMessage({ type: 'error', text: json.error });
      } else if (json.photos) {
        setPhotos(prev => [...prev, ...json.photos]);
        setMessage({ type: 'success', text: `${json.photos.length} фото завантажено.` });
      }
    } catch (err) {
      console.error('Upload error:', err);
      setMessage({ type: 'error', text: 'Помилка при завантаженні фотографій.' });
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!validateForm()) return;

    setLoading(true);
    const payload: any = { ...formData, photos };
    
    // Coordinates are now auto-generated in the backend using autoGeocode

    try {
      const res = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Помилка при відправці');

      setMessage({ type: 'success', text: 'Анкету надіслано на модерацію.' });
      setFormData({
        fullName: '', status: 'UNKNOWN', dob: '', callsign: '',
        unit: '', dateOfEvent: '', locationOfEvent: '',
        placeOfResidence: '', specialFeatures: '', extraInfo: ''
      });
      setPhotos([]);
      setMatches([]);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Сталася помилка.' });
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return <div className="page"><p>Перевірка доступу...</p></div>;
  }

  return (
    <div className="form-page">
      <div className="form-box">
        <h2>Додати запис</h2>
        <p className="desc">Інформація проходить модерацію перед публікацією.</p>

        {message && (
          <div className={message.type === 'success' ? 'success-msg' : 'error-msg'}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-cols">
            <div className="form-field">
              <label>ПІБ (повністю) *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e => { setFormData({...formData, fullName: e.target.value}); if (errors.fullName) setErrors(prev => ({...prev, fullName: ''})); }}
                style={errors.fullName ? { borderColor: '#ef4444' } : {}}
              />
              {errors.fullName && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.fullName}</div>}
            </div>
            <div className="form-field">
              <label>Статус</label>
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="UNKNOWN">Невідомо</option>
                <option value="KILLED">Загинув</option>
                <option value="MISSING">Зник безвісти</option>
                <option value="CAPTURED">Полонений</option>
              </select>
            </div>
          </div>

          {/* Matching */}
          {(matches.length > 0 || matchLoading) && (
            <div style={{
              border: '1px solid var(--yellow)',
              padding: '12px 14px',
              marginBottom: '16px',
              background: 'rgba(184, 148, 46, 0.06)',
              fontSize: '13px',
            }}>
              {matchLoading ? (
                <span style={{ color: 'var(--text-dim)' }}>Пошук збігів...</span>
              ) : (
                <>
                  <div style={{ color: 'var(--yellow)', marginBottom: '8px', fontWeight: 500 }}>
                    Знайдено {matches.length} можливих збігів:
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: '11px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>ПІБ</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: '11px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>Статус</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: '11px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>Підрозділ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map(m => (
                        <tr key={m._id}>
                          <td style={{ padding: '4px 8px', color: 'var(--text)' }}>{m.fullName}</td>
                          <td style={{ padding: '4px 8px', color: 'var(--text-dim)' }}>{statusText(m.status)}</td>
                          <td style={{ padding: '4px 8px', color: 'var(--text-dim)' }}>{m.unit || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ color: 'var(--text-dim)', marginTop: '8px', fontSize: '12px' }}>
                    Якщо це та сама особа — не дублюйте запис.
                  </div>
                </>
              )}
            </div>
          )}

          <div className="form-cols">
            <div className="form-field">
              <label>Дата народження</label>
              <input type="text" placeholder="15.03.1990" value={formData.dob} onChange={e => { setFormData({...formData, dob: e.target.value}); if (errors.dob) setErrors(prev => ({...prev, dob: ''})); }} style={errors.dob ? { borderColor: '#ef4444' } : {}} />
              {errors.dob && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.dob}</div>}
            </div>
            <div className="form-field">
              <label>Позивний / Жетон</label>
              <input type="text" value={formData.callsign} onChange={e => { setFormData({...formData, callsign: e.target.value}); if (errors.callsign) setErrors(prev => ({...prev, callsign: ''})); }} style={errors.callsign ? { borderColor: '#ef4444' } : {}} />
              {errors.callsign && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.callsign}</div>}
            </div>
          </div>

          <div className="form-field">
            <label>Підрозділ</label>
            <input type="text" value={formData.unit} onChange={e => { setFormData({...formData, unit: e.target.value}); if (errors.unit) setErrors(prev => ({...prev, unit: ''})); }} style={errors.unit ? { borderColor: '#ef4444' } : {}} />
            {errors.unit && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.unit}</div>}
          </div>

          <div className="form-cols">
            <div className="form-field">
              <label>Дата зникнення / події</label>
              <input type="text" placeholder="01.01.2024" value={formData.dateOfEvent} onChange={e => { setFormData({...formData, dateOfEvent: e.target.value}); if (errors.dateOfEvent) setErrors(prev => ({...prev, dateOfEvent: ''})); }} style={errors.dateOfEvent ? { borderColor: '#ef4444' } : {}} />
              {errors.dateOfEvent && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.dateOfEvent}</div>}
            </div>
            <div className="form-field">
              <label>Місце події</label>
              <input type="text" value={formData.locationOfEvent} onChange={e => setFormData({...formData, locationOfEvent: e.target.value})} />
            </div>
          </div>



          <div className="form-field">
            <label>Місце проживання</label>
            <input type="text" value={formData.placeOfResidence} onChange={e => setFormData({...formData, placeOfResidence: e.target.value})} />
          </div>

          <div className="form-field">
            <label>Особливі прикмети</label>
            <textarea
              value={formData.specialFeatures}
              onChange={e => setFormData({...formData, specialFeatures: e.target.value})}
            ></textarea>
          </div>

          {/* Photos */}
          <div className="form-field">
            <label>Фотографії</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: photos.length > 0 ? '12px' : '0' }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 18, height: 18, padding: 0,
                      fontSize: '11px', lineHeight: '16px',
                      background: 'rgba(0,0,0,0.7)', color: '#fff',
                      border: 'none', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center'
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.png"
              multiple
              onChange={handlePhotoUpload}
              style={{ fontSize: '13px' }}
            />
            {uploadingPhotos && <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '8px' }}>Завантаження...</span>}
          </div>

          <div className="form-field">
            <label>Додаткова інформація</label>
            <textarea value={formData.extraInfo} onChange={e => { setFormData({...formData, extraInfo: e.target.value}); if (errors.extraInfo) setErrors(prev => ({...prev, extraInfo: ''})); }} style={errors.extraInfo ? { borderColor: '#ef4444' } : {}}></textarea>
            {errors.extraInfo && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.extraInfo}</div>}
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Відправка...' : 'Надіслати'}
          </button>
        </form>
      </div>
    </div>
  );
}
