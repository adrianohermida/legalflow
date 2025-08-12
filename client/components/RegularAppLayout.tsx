import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from './AppShell';
import { OABSelectionModal } from './OABSelectionModal';

interface RegularAppLayoutProps {
  userType: 'advogado' | 'cliente';
}

export function RegularAppLayout({ userType }: RegularAppLayoutProps) {
  const { user, isLoading, logout } = useAuth();
  const [showOABModal, setShowOABModal] = useState(false);

  useEffect(() => {
    if (user && !user.oab && userType === 'advogado') {
      setShowOABModal(true);
    }
  }, [user, userType]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AppShell userType={userType} user={user} logout={logout}>
        <Outlet />
      </AppShell>
      {userType === 'advogado' && (
        <OABSelectionModal
          open={showOABModal}
          onOpenChange={setShowOABModal}
        />
      )}
    </>
  );
}
