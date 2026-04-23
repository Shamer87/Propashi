'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
const defaultLinks = [
  { href: '/', label: 'Огляд' },
  { href: '/search', label: 'Пошук' },
  { href: '/map', label: 'Карта' },
  { href: '/submit', label: 'Додати' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [links, setLinks] = useState(defaultLinks);
  const [isLogged, setIsLogged] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        const newLinks = [...defaultLinks];
        if (d?.role === 'ADMIN' || d?.role === 'MODERATOR') {
          newLinks.push({ href: '/moderation', label: 'Модерація' });
        }
        if (d?.role) {
          // If logged in (any role), show profile and settings
          newLinks.push({ href: '/profile', label: 'Кабінет' });
          newLinks.push({ href: '/settings', label: 'Налаштування' });
          setIsLogged(true);
        }
        setLinks(newLinks);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="site-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', height: '100%' }}>
        <Link href="/" className="logo" style={{ textDecoration: 'none' }}>
          Пропащі
        </Link>
        <nav className="site-nav">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
          {isLogged ? (
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '12px 16px', fontSize: '1rem' }}>
              Вийти
            </button>
          ) : (
            <Link href="/login" style={{ color: 'var(--blue)', textDecoration: 'none', padding: '12px 16px', fontSize: '1rem' }}>
              Увійти
            </Link>
          )}
        </nav>
      </div>

      <button
        className="mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu"
      >
        {mobileOpen ? '✕' : '≡'}
      </button>

      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? 'active' : ''}
            onClick={() => setMobileOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        {isLogged ? (
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '16px', fontSize: '1rem', textAlign: 'left' }}>
            Вийти
          </button>
        ) : (
          <Link href="/login" onClick={() => setMobileOpen(false)} style={{ color: 'var(--blue)', textDecoration: 'none', padding: '16px', fontSize: '1rem' }}>
            Увійти
          </Link>
        )}
      </div>
    </header>
  );
}
