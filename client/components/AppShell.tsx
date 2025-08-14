import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { OfficeModulesWindow } from './OfficeModulesWindow';
import { NotificationPanel } from './NotificationPanel';
import { ChatDock } from './ChatDock';
import { CommandPalette } from './CommandPalette';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface AppShellProps {
  userType: 'advogado' | 'cliente';
  user?: any;
  logout?: () => void;
  children?: React.ReactNode;
}

export function AppShell({ userType, user, logout, children }: AppShellProps) {
  const [isOfficeModulesOpen, setIsOfficeModulesOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isChatDockOpen, setIsChatDockOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'cmd+k': () => setIsCommandPaletteOpen(true),
    'ctrl+k': () => setIsCommandPaletteOpen(true),
    'g+p': () => navigate('/processos'),
    'g+c': () => navigate('/clientes'),
    'escape': () => {
      setIsOfficeModulesOpen(false);
      setIsNotificationPanelOpen(false);
      setIsCommandPaletteOpen(false);
    },
  });

  const handleOfficeModulesToggle = () => {
    setIsOfficeModulesOpen(!isOfficeModulesOpen);
    if (isNotificationPanelOpen) setIsNotificationPanelOpen(false);
  };

  const handleNotificationToggle = () => {
    setIsNotificationPanelOpen(!isNotificationPanelOpen);
    if (isOfficeModulesOpen) setIsOfficeModulesOpen(false);
  };

  const handleChatToggle = () => {
    setIsChatDockOpen(!isChatDockOpen);
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar userType={userType} />

      {/* Main Content Area */}
      <div className="app-main">
        {/* Header */}
        <Header
          userType={userType}
          onAppLauncherToggle={handleAppLauncherToggle}
          onNotificationToggle={handleNotificationToggle}
          onChatToggle={handleChatToggle}
          onSearchClick={() => setIsCommandPaletteOpen(true)}
          user={user}
          logout={logout}
        />

        {/* Page Content */}
        <main id="main-content" className="app-content" role="main">
          {children}
        </main>
      </div>

      {/* Overlays and Modals */}
      {isAppLauncherOpen && (
        <AppLauncher 
          isOpen={isAppLauncherOpen}
          onClose={() => setIsAppLauncherOpen(false)}
          userType={userType}
        />
      )}

      {isNotificationPanelOpen && (
        <NotificationPanel
          isOpen={isNotificationPanelOpen}
          onClose={() => setIsNotificationPanelOpen(false)}
          userType={userType}
        />
      )}

      {isChatDockOpen && (
        <ChatDock
          isOpen={isChatDockOpen}
          onClose={() => setIsChatDockOpen(false)}
          userType={userType}
        />
      )}

      {isCommandPaletteOpen && (
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          userType={userType}
        />
      )}
    </div>
  );
}
