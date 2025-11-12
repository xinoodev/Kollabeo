import React, { useState } from 'react';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import { ThemeSelector } from '../ui/ThemeSelector';
import { LogOut, Plus, User, Settings } from 'lucide-react';

interface HeaderProps {
  onCreateProject: () => void;
  onNavigateToProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onCreateProject, onNavigateToProfile }) => {
  const { user, signOut } = useAuth();
  const { isDark } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-profile-dropdown]')) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isProfileOpen]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - Left side */}
          <div className="flex items-center space-x-4">
            <img
              src={isDark
                ? "https://res.cloudinary.com/dg7ngopcp/image/upload/v1762980016/logo-fondo-oscuro_l1wg1h.png"
                : "https://res.cloudinary.com/dg7ngopcp/image/upload/v1762980016/logo-fondo-claro_gtmdzy.png"
              }
              alt="Kollabeo Logo"
              className="h-8 w-18 rounded-lg object-cover"
            />
          </div>

          {/* Actions - Right side */}
          <div className="flex items-center space-x-4">
            <Button onClick={onCreateProject} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>

            <div className="relative" data-profile-dropdown>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user?.username || user?.full_name}
                    className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.username || user?.full_name}
                </span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-2">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2 mb-2">
                        <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
                      </div>
                      <ThemeSelector showLabels={false} size="sm" />
                    </div>
                    {onNavigateToProfile && (
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          onNavigateToProfile();
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile Settings
                      </button>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};