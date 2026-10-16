import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

const Layout = ({ children, hideFooter = false }) => {
  const { pathname } = useLocation();
  return (
    <div className={pathname.startsWith('/admin') ? 'private-site' : 'consulting-site'}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main-content" tabIndex={-1}>{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;
