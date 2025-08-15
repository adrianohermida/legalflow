import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarCustomizable } from "./SidebarCustomizable";
import { Header } from "./Header";
import { AppLauncherMosaic } from "./AppLauncherMosaic";
import { NotificationPanel } from "./NotificationPanel";
import { ChatDock } from "./ChatDock";
import { GlobalSearchPalette } from "./GlobalSearchPalette";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

interface AppShellProps {
  userType: "advogado" | "cliente";
  user?: any;
  logout?: () => void;
  children?: React.ReactNode;
}

export function AppShell({ userType, user, logout, children }: AppShellProps) {
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isChatDockOpen, setIsChatDockOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [sidebarItems, setSidebarItems] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  // Keyboard shortcuts - Flow B1
  useKeyboardShortcuts({
    "cmd+k": () => setIsGlobalSearchOpen(true),
    "ctrl+k": () => setIsGlobalSearchOpen(true),
    "g+p": () => navigate("/processos-v2"),
    "g+c": () => navigate("/clientes"),
    "g+a": () => navigate("/agenda"),
    "g+j": () => navigate("/jornadas"),
    "g+i": () => navigate("/inbox-v2"),
    "g+d": () => navigate("/documentos"),
    "g+f": () => navigate("/financeiro"),
    "g+r": () => navigate("/relatorios"),
    "g+h": () => navigate("/helpdesk"),
    "g+s": () => navigate("/servicos"),
    escape: () => {
      setIsAppLauncherOpen(false);
      setIsNotificationPanelOpen(false);
      setIsGlobalSearchOpen(false);
      setIsChatDockOpen(false);
    },
  });

  const handleAppLauncherToggle = () => {
    setIsAppLauncherOpen(!isAppLauncherOpen);
    if (isNotificationPanelOpen) setIsNotificationPanelOpen(false);
  };

  const handleNotificationToggle = () => {
    setIsNotificationPanelOpen(!isNotificationPanelOpen);
    if (isAppLauncherOpen) setIsAppLauncherOpen(false);
  };

  const handleChatToggle = () => {
    setIsChatDockOpen(!isChatDockOpen);
  };

  const handleSidebarUpdate = (updatedItems: any[]) => {
    setSidebarItems(updatedItems);
  };

  return (
    <div className="app-shell">
      {/* Sidebar Customizável */}
      <SidebarCustomizable userType={userType} />

      {/* Main Content Area */}
      <div className="app-main">
        {/* Header */}
        <Header
          userType={userType}
          onAppLauncherToggle={handleAppLauncherToggle}
          onNotificationToggle={handleNotificationToggle}
          onChatToggle={handleChatToggle}
          onSearchClick={() => setIsGlobalSearchOpen(true)}
          user={user}
          logout={logout}
        />

        {/* Page Content */}
        <main id="main-content" className="app-content" role="main">
          {children}
        </main>
      </div>

      {/* Overlays and Modals - Flow B1 */}
      {isAppLauncherOpen && (
        <AppLauncherMosaic
          isOpen={isAppLauncherOpen}
          onClose={() => setIsAppLauncherOpen(false)}
          userType={userType}
          onUpdateSidebar={handleSidebarUpdate}
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

      {isGlobalSearchOpen && (
        <GlobalSearchPalette
          isOpen={isGlobalSearchOpen}
          onClose={() => setIsGlobalSearchOpen(false)}
          userType={userType}
        />
      )}
    </div>
  );
}
