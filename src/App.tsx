import React, { useState } from 'react';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthForm } from './components/auth/AuthForm';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { Dashboard } from './pages/Dashboard';
import { ProjectView } from './pages/ProjectView';
import { Profile } from './pages/Profile';
import { Project } from './types';
import { Loader2 } from 'lucide-react';

type View = 'dashboard' | 'project' | 'profile';

function AppContent() {
  const { user, loading } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token && (window.location.pathname === '/verify-email' || window.location.pathname === '/reset-password')) {
      return;
    }
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');

  if (resetToken && window.location.pathname === '/reset-password') {
    return <ResetPasswordPage token={resetToken} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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