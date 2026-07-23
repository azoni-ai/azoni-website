import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children, hideFooter = false }) => {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main-content">{children}</main>
      {!hideFooter && <Footer />}
    </>
  );
};

export default Layout;
