import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Profile } from './pages/Profile';
import { AuthForm } from './components/auth/AuthForm';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { AcceptInvitation } from './pages/AcceptInvitation';
import { ProjectView } from './pages/ProjectView';
import { Project } from './types';
import { useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Loader2 } from 'lucide-react';
import React, { useState } from 'react';

type View = 'dashboard' | 'project' | 'profile' | 'invitation';

function AppContent() {
  const { user, loading } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailToken = urlParams.get('token');
    const linkToken = urlParams.get('link');

    // Check if we're on a special page
    if (emailToken && (window.location.pathname === '/verify-email' || window.location.pathname === '/reset-password')) {
      return;
    }

    // Check for invitation in URL
    if ((emailToken || linkToken) && window.location.pathname === '/accept-invitation') {
      setCurrentView('invitation');
      return;
    }

    // Check for pending invitation after login
    const pendingInvitation = sessionStorage.getItem('pendingInvitation');
    const pendingInvitationType = sessionStorage.getItem('pendingInvitationType');
    if (pendingInvitation && user) {
      sessionStorage.removeItem('pendingInvitation');
      sessionStorage.removeItem('pendingInvitationType');
      const paramName = pendingInvitationType === 'link' ? 'link' : 'token';
      window.history.replaceState({}, '', `/accept-invitation?${paramName}=${pendingInvitation}`);
      setCurrentView('invitation');
    }
  }, [user]);

  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');

  // Handle reset password page
  if (resetToken && window.location.pathname === '/reset-password') {
    return <ResetPasswordPage token={resetToken} />;
  }

  // Handle invitation page
  if (window.location.pathname === '/accept-invitation') {
    return (
      <AcceptInvitation
        onGoToProject={(project: Project) => {
          setSelectedProject(project);
          setCurrentView('project');
          window.history.replaceState({}, '', '/');
        }}
        onGoToDashboard={() => {
          window.history.replaceState({}, '', '/');
          setCurrentView('dashboard');
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !user.email_verified) {
    return <AuthForm />;
  }

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('project');
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
    setCurrentView('dashboard');
  };

  const handleNavigateToProfile = () => {
    setCurrentView('profile');
  };

  if (currentView === 'profile') {
    return <Profile onBack={handleBackToDashboard} />;
  }

  if (currentView === 'project' && selectedProject) {
    return (
      <ProjectView
        project={selectedProject}
        onBack={handleBackToDashboard}
        onNavigateToProfile={handleNavigateToProfile}
      />
    );
  }

  return (
    <Dashboard
      onProjectSelect={handleProjectSelect}
      onNavigateToProfile={handleNavigateToProfile}
    />
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;