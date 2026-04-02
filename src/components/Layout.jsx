import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children, hideFooter = false }) => {
  return (
    <>
      <div className="construction-banner">
        <span className="construction-stripe" />
        <span>Under Construction — redesigning the homepage</span>
        <span className="construction-stripe" />
      </div>
      <Navbar />
      <main>{children}</main>
      {!hideFooter && <Footer />}
    </>
  );
};

export default Layout;
