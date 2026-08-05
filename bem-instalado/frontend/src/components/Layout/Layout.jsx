import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import Sidebar from './Sidebar';
import Header from './Header';
import InstallerPanelShell from './InstallerPanelShell';
import { EmailVerificationNotice } from '../Auth/EmailVerification';

const PANEL_ROUTE_PREFIXES = [
  '/agenda',
  '/budgets',
  '/clients',
  '/download-app',
  '/opportunities',
  '/reviews',
  '/profile',
  '/settings',
  '/subscription',
  '/notifications',
  '/support',
  '/admin',
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isStandaloneDashboard = location.pathname === '/dashboard';
  const isInstallerPanelRoute = PANEL_ROUTE_PREFIXES.some((route) =>
    location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (isStandaloneDashboard) {
    return (
      <div className="app-layout dashboard-reference-layout panel-flat-language panel-v3">
        <EmailVerificationNotice />
        <Outlet />
      </div>
    );
  }

  if (isInstallerPanelRoute) {
    return (
      <div className="app-layout dashboard-reference-layout panel-flat-language panel-v3">
        <InstallerPanelShell>
          <EmailVerificationNotice />
          <Outlet />
        </InstallerPanelShell>
      </div>
    );
  }

  return (
    <div className="app-layout app-layout-shell overflow-x-hidden md:flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative min-w-0 flex-1">
        <Header onOpenMenu={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-[1480px] px-4 pb-10 pt-6 sm:px-5 lg:px-8 xl:px-10">
          <div className="min-w-0 space-y-6">
            <EmailVerificationNotice />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
