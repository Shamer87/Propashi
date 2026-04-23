'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [invites, setInvites] = useState<any[]>([]);
  const [inviteError, setInviteError] = useState('');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        setSessionInfo(d);
        if (d?.role === 'ADMIN') loadInvites();
      })
      .catch(() => { window.location.href = '/login'; });
  }, []);

  const loadInvites = async () => {
    try {
      const res = await fetch('/api/auth/invites');
      const json = await res.json();
      if (json.data) setInvites(json.data);
    } catch {}
  };

  const handleCreateInvite = async (role: string) => {
    setInviteError('');
    try {
      const res = await fetch('/api/auth/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (res.ok) loadInvites();
      else setInviteError(data.error);
    } catch {
      setInviteError('Збій');
    }
  };

  const handleDeleteInvite = async (id: string) => {
    try {
      await fetch('/api/auth/invites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      loadInvites();
    } catch {}
  };

  const handleCopy = (id: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const getStatus = (inv: any) => {
    if (inv.isUsed) return 'used';
    if (new Date(inv.expiresAt) < new Date()) return 'expired';
    return 'active';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword })
      });
      const data = await res.json();
      if (res.ok) { setSuccess('Збережено.'); setUsername(data.username); setNewPassword(''); }
      else setError(data.error || 'Помилка');
    } catch { setError('Збій підключення'); }
    finally { setLoading(false); }
  };

  return (
    <div className="page" style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '40px' }}>
      <h1 className="page-title">Налаштування</h1>

      <div style={{ border: '1px solid var(--border)', padding: '20px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '15px', marginBottom: '16px' }}>Профіль</h2>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Новий логін</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Новий пароль</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Збереження...' : 'Зберегти'}
          </button>
        </form>
      </div>

      {sessionInfo?.role === 'ADMIN' && (
        <div style={{ border: '1px solid var(--border)', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', marginBottom: '6px' }}>Запрошення</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>
            Одноразові посилання, дійсні 1 годину.
          </p>

          {inviteError && <div className="error-msg" style={{ marginBottom: '12px' }}>{inviteError}</div>}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button onClick={() => handleCreateInvite('MODERATOR')}>+ Модератор</button>
            <button onClick={() => handleCreateInvite('USER')}>+ Користувач</button>
          </div>

          {invites.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
              Немає посилань
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {invites.map(inv => {
                const link = `${window.location.origin}/register/${inv.token}`;
                const isCopied = copiedId === inv._id;
                const status = getStatus(inv);

                return (
                  <div key={inv._id} style={{
                    border: '1px solid var(--border)',
                    padding: '12px',
                    fontSize: '13px',
                    opacity: status !== 'active' ? 0.6 : 1,
                    background: status === 'used' ? 'rgba(34,197,94,0.05)' : undefined,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>{inv.role === 'MODERATOR' ? 'Модератор' : 'Користувач'}</span>
                      <span style={{
                        fontSize: '12px',
                        color: status === 'active' ? '#22c55e' : status === 'used' ? '#60a5fa' : '#ef4444',
                      }}>
                        {status === 'active' ? 'Дійсне' : status === 'used' ? 'Використано' : 'Прострочено'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={link}
                        readOnly
                        onClick={e => (e.target as HTMLInputElement).select()}
                        style={{
                          flex: 1,
                          fontSize: '12px',
                          padding: '8px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          fontFamily: 'monospace',
                        }}
                      />
                      {status === 'active' && (
                        <button
                          onClick={() => handleCopy(inv._id, link)}
                          style={{
                            padding: '8px 10px',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            background: isCopied ? '#22c55e' : undefined,
                            color: isCopied ? '#fff' : undefined,
                            border: isCopied ? 'none' : undefined,
                          }}
                        >
                          {isCopied ? 'Скопійовано' : 'Копіювати'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteInvite(inv._id)}
                        style={{
                          padding: '8px 10px',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                          background: 'rgba(239,68,68,0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.3)',
                          cursor: 'pointer',
                        }}
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 30, textAlign: 'center' }}>
        <a href="/search" style={{ fontSize: 13 }}>← Назад до пошуку</a>
      </div>
    </div>
  );
}
