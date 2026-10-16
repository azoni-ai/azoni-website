import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
const links = [{ path: '/services', label: 'Services' }, { path: '/projects', label: 'Projects' }, { path: '/live', label: 'Live' }, { path: '/about', label: 'About me' }, { path: '/resume', label: 'Resume' }, { path: '/chat', label: 'Chat' }];
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
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <Link className="site-wordmark navbar-logo" to="/" onClick={() => setOpen(false)} aria-label="Azoni home">
          <span>azoni<span className="navbar-logo-dot">.</span></span>
        </Link>
        <button ref={toggle} className="site-menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        <div id="site-navigation" className={`site-navigation${open ? ' is-open' : ''}`}>
          {links.map(({ path, label }) => <Link key={path} to={path} aria-current={pathname === path || pathname.startsWith(`${path}/`) ? 'page' : undefined}>{label}</Link>)}
          <Link className="site-nav-contact" to="/contact" onClick={() => setOpen(false)}>Email me <ArrowUpRight size={16} /></Link>
        </div>
      </nav>
    </header>
  );
}
