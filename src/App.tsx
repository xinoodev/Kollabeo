import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import NotificationToasts from './components/ui/NotificationToasts';
import { Profile } from './pages/Profile';
import { AuthForm } from './components/auth/AuthForm';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { AcceptInvitation } from './pages/AcceptInvitation';
import { ProjectView } from './pages/ProjectView';
import { apiClient } from './lib/api';
import { Project } from './types';
import { useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

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

  // Restore project view from URL on load (after auth ready)
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const path = window.location.pathname;
    const match = path.match(/^\/projects\/(\d+)\/?$/);
    if (!match) return;

    const projectId = Number(match[1]);
    (async () => {
      try {
        const p = await apiClient.getProject(projectId);
        if (p) {
          setSelectedProject(p);
          setCurrentView('project');
        } else {
          setCurrentView('dashboard');
        }
      } catch (err) {
        console.error('Failed to load project from URL', err);
        setCurrentView('dashboard');
      }
    })();
  }, [loading, user]);

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
          try { window.history.replaceState({}, '', `/projects/${project.id}`); } catch (e) {}
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
    try { window.history.pushState({}, '', `/projects/${project.id}`); } catch (e) {}
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
    setCurrentView('dashboard');
    try { window.history.replaceState({}, '', '/'); } catch (e) {}
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
      <LanguageProvider>
        <AuthProvider>
          <NotificationsProvider>
            <Router>
              <NotificationToasts />
              <AppContent />
            </Router>
          </NotificationsProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;