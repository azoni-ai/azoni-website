import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { bookingCta, meetLive, resumePath } from '../data/consulting';
const links = [{ path: '/projects', label: 'Work' }, { path: '/about', label: 'About' }, { path: resumePath, label: 'Resume' }, { path: '/services', label: 'Consulting' }];
const isCurrent = (pathname, path) => (pathname === path || pathname.startsWith(`${path}/`) ? 'page' : undefined);
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const toggle = useRef(null);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <header className="admin-site-header">
        <Link className="site-wordmark navbar-logo" to="/" aria-label="Azoni home"><span>azoni<span className="navbar-logo-dot">.</span></span></Link>
        <Link className="admin-view-site" to="/">View website <ArrowUpRight size={16} /></Link>
      </header>
    );
  }
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <div className="site-brand">
          <Link className="site-wordmark navbar-logo" to="/" onClick={() => setOpen(false)} aria-label="Charlton Smith, home">
            <span aria-hidden="true">azoni<span className="navbar-logo-dot">.</span></span>
            <span className="site-wordmark-caption">Charlton Smith</span>
          </Link>
        </div>
        <button ref={toggle} className="site-menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        <div id="site-navigation" className={`site-navigation${open ? ' is-open' : ''}`}>
          {links.map(({ path, label }) => <Link key={path} to={path} onClick={() => setOpen(false)} aria-current={isCurrent(pathname, path)}>{label}</Link>)}
          {/* The spot for availability: "Book a call" shows once /meet takes bookings (meetLive). */}
          {meetLive && <Link className="site-nav-cta" to={bookingCta.to} onClick={() => setOpen(false)} aria-current={isCurrent(pathname, bookingCta.to)}>{bookingCta.label}</Link>}
        </div>
      </nav>
    </header>
  );
}
