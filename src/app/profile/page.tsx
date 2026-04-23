'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type PersonRecord = {
  _id: string;
  fullName: string;
  status: string;
  dateOfEvent?: string;
  isApproved: boolean;
  createdAt: string;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<PersonRecord[]>([]);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user info and their submissions
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      // We will need to update /api/persons to allow user to fetch their own records
      // Wait, currently GET /api/persons doesn't return unapproved records for normal users.
      // Let's create a special endpoint or just update /api/auth/profile to return user + their records.
      // For now, let's fetch from a new endpoint /api/auth/profile
      fetch('/api/auth/profile').then(r => r.json())
    ]).then(([me, profile]) => {
      if (!me?.userId) {
        window.location.href = '/login';
        return;
      }
      setUser(profile.user);
      setRecords(profile.records || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const generateToken = async () => {
    try {
      const res = await fetch('/api/auth/telegram-link', { method: 'POST' });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="page"><p>Завантаження...</p></div>;
  }

  return (
    <div className="page" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Особистий кабінет</h1>
        <Link href="/settings" className="btn" style={{ textDecoration: 'none', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>Налаштування (та запрошення)</Link>
      </div>
      
      <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '10px' }}>Підключення Telegram</h2>
        {user?.telegramChatId ? (
          <p style={{ color: 'var(--green)' }}>✅ Ваш акаунт підключено до Telegram. Ви отримуватимете сповіщення.</p>
        ) : (
          <div>
            <p style={{ color: 'var(--text-dim)', marginBottom: '10px' }}>
              Підключіть Telegram, щоб ми могли надсилати вам сповіщення, коли статус ваших заявок зміниться (наприклад, коли модератор їх схвалить).
            </p>
            {token ? (
              <div style={{ padding: '15px', background: 'rgba(59,130,246,0.1)', border: '1px solid var(--blue)', borderRadius: '6px' }}>
                <div style={{ marginBottom: '8px' }}>1. Відкрийте нашого бота в Telegram: <strong>@PropashiBot</strong></div>
                <div style={{ marginBottom: '8px' }}>2. Надішліть йому це повідомлення (просто скопіюйте):</div>
                <code style={{ display: 'block', margin: '10px 0', padding: '10px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', fontSize: '18px', cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(`/link ${token}`)}>
                  /link {token}
                </code>
                <div>3. Оновіть цю сторінку після того, як бот відповість.</div>
              </div>
            ) : (
              <button className="btn" onClick={generateToken}>Отримати код для підключення</button>
            )}
          </div>
        )}
      </div>

      <h2 style={{ marginBottom: '15px' }}>Мої заявки ({records.length})</h2>
      {records.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>Ви ще не подавали жодної заявки.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ПІБ</th>
                <th>Статус заявки</th>
                <th>Дата події</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r._id}>
                  <td>{r.fullName}</td>
                  <td>
                    {r.isApproved ? (
                      <span style={{ color: 'var(--green)' }}>Схвалено</span>
                    ) : (
                      <span style={{ color: 'var(--yellow)' }}>На модерації</span>
                    )}
                  </td>
                  <td>{r.dateOfEvent || '-'}</td>
                  <td>
                    <Link href={`/record/${r._id}`} style={{ color: 'var(--blue)' }}>
                      Переглянути / Редагувати
                    </Link>
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
