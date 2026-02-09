import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full w-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-20">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;