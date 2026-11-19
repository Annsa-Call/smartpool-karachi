import React from 'react';
import { SmartPoolProvider, useSmartPool } from './context/SmartPoolContext';
import { OnboardingFlow } from './components/OnboardingFlow';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { ExploreScreen } from './components/ExploreScreen';
import { ActiveRideScreen } from './components/ActiveRideScreen';
import { WalletImpactScreen } from './components/WalletImpactScreen';
import { PublishRideScreen } from './components/PublishRideScreen';
import { PublisherRequestsScreen } from './components/PublisherRequestsScreen';
import { PublisherDriveScreen } from './components/PublisherDriveScreen';
import { PublisherEarningsScreen } from './components/PublisherEarningsScreen';
import { ProfileTrustScreen } from './components/ProfileTrustScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAuthModal } from './components/AdminAuthModal';
import { ChatDrawer } from './components/ChatDrawer';
import { FarePaymentModal } from './components/FarePaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { EmergencySOSModal } from './components/EmergencySOSModal';
import { ToastStack } from './components/ToastStack';

const SmartPoolShell: React.FC = () => {
  const {
    currentUser,
    role,
    passengerTab,
    publisherTab,
    isAdminAuthenticated,
  } = useSmartPool();

  // Password-Protected System Control Unit (strictly gated by backend authentication)
  if (role === 'admin' && isAdminAuthenticated) {
    return (
      <>
        <AdminDashboard />
        <ReceiptModal />
        <ToastStack />
      </>
    );
  }

  // Citizen Authentication & 4-Step NADRA CNIC KYC Registration
  if (!currentUser) {
    return (
      <>
        <OnboardingFlow />
        <AdminAuthModal />
        <ToastStack />
      </>
    );
  }

  // Strict Role-Scoped Workspace (Passenger Mode vs. Publisher Mode — Zero Cross-Role Clutter)
  const renderRoleScreen = () => {
    if (role === 'publisher') {
      switch (publisherTab) {
        case 'publish':
          return <PublishRideScreen />;
        case 'requests':
          return <PublisherRequestsScreen />;
        case 'drive':
          return <PublisherDriveScreen />;
        case 'earnings':
          return <PublisherEarningsScreen />;
        case 'profile':
          return <ProfileTrustScreen />;
      }
    }

    switch (passengerTab) {
      case 'explore':
        return <ExploreScreen />;
      case 'ride':
        return <ActiveRideScreen />;
      case 'wallet':
        return <WalletImpactScreen />;
      case 'profile':
        return <ProfileTrustScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-200/70 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-slate-50 shadow-2xl flex flex-col relative">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">{renderRoleScreen()}</main>
        <BottomNav />
      </div>

      {/* Role-Aware Interactive Modals & Drawers */}
      <ChatDrawer />
      <FarePaymentModal />
      <ReceiptModal />
      <EmergencySOSModal />
      <AdminAuthModal />
      <ToastStack />
    </div>
  );
};

export function App() {
  return (
    <SmartPoolProvider>
      <SmartPoolShell />
    </SmartPoolProvider>
  );
}

export default App;
