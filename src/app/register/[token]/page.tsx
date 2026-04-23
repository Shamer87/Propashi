'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function RegisterInvitePage() {
  const router = useRouter();
  const { token } = useParams();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteRole, setInviteRole] = useState('');
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    fetch(`/api/auth/invites/${token}`)
      .then(res => res.json())
      .then(json => {
        if (json.valid) {
          setInviteValid(true);
          setInviteRole(json.role);
        } else {
          setInviteValid(false);
          setInviteError(json.error || 'Недійсне посилання');
        }
      })
      .catch(() => {
        setInviteValid(false);
        setInviteError('Помилка підключення');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register-with-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = '/search';
      } else {
        setError(data.error || 'Помилка реєстрації');
      }
    } catch (err) {
      setError('Збій мережі. Спробуйте пізніше.');
    } finally {
      setLoading(false);
    }
  };

  if (inviteValid === null) {
    return (
      <div className="form-page">
        <div className="form-box">
          <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>Перевірка запрошення...</p>
        </div>
      </div>
    );
  }

  if (inviteValid === false) {
    return (
      <div className="form-page">
        <div className="form-box" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--red)' }}>Запрошення недійсне</h2>
          <p className="desc">{inviteError}</p>
          <Link href="/" style={{ color: 'var(--text-dim)', marginTop: '20px', display: 'inline-block' }}>Повернутися на головну</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-box">
        <h2>Реєстрація ({inviteRole === 'MODERATOR' ? 'Модератор' : 'Користувач'})</h2>
        <p className="desc">Ви використовуєте приватне посилання-запрошення. Після реєстрації посилання стане недійсним.</p>
        
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div className="form-field">
            <label>Логін</label>
            <input
              type="text"
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Придумайте логін"
            />
          </div>
          
          <div className="form-field">
            <label>Пароль</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Мінімум 6 символів"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Реєстрація...' : 'Зареєструватись'}
          </button>
        </form>
      </div>
    </div>
  );
}
