import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';
import '../styles/admin-shell.css';

const Layout = ({ children, hideFooter = false }) => {
  const { pathname } = useLocation();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  return (
    <div className={isAdmin ? 'private-site' : 'consulting-site'}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main-content" tabIndex={-1}>{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;
