import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useDemoAuth } from '../contexts/DemoAuthContext';
import { AppShell } from './AppShell';
import { DemoOABSelectionModal } from './DemoOABSelectionModal';

interface DemoAppLayoutProps {
  userType: 'advogado' | 'cliente';
}

export function DemoAppLayout({ userType }: DemoAppLayoutProps) {
  const { user, isLoading, logout } = useDemoAuth();
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
          <p className="text-neutral-600">Carregando Demo...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('DemoAppLayout: No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('DemoAppLayout: User found:', user);

  return (
    <>
      <AppShell userType={userType} user={user} logout={logout}>
        <Outlet />
      </AppShell>
      {userType === 'advogado' && (
        <DemoOABSelectionModal
          open={showOABModal}
          onOpenChange={setShowOABModal}
        />
      )}
    </>
  );
}
