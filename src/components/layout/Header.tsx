import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { ThemeSelector } from '../ui/ThemeSelector';
import { LogOut, Plus, User, Settings } from 'lucide-react';

interface HeaderProps {
  onCreateProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onCreateProject }) => {
  const { user, signOut } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
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
    <header className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          <div className='flex items-center space-x-4'>
            <div className='h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center'>
              <span className='text-white font-bold text-sm'>K</span>
            </div>
            <h1 className='text-xl font-semibold text-gray-900 dark:text-white'>Kollabeo</h1>
          </div>

          <div className='flex items-center space-x-4'>
            <Button onClick={onCreateProject} size='sm'>
              <Plus className='mr-2 h-4 w-4' />
              New Project
            </Button>
            <div className='relative' data-profile-dropdown>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className='flex items-center space-x-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200'
              >
                <div className='h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center'>
                  <User className='h-4 w-4 text-blue-600' />
                </div>
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  {user?.full_name || user?.email}
                </span>
              </button>

              {isProfileOpen && (
                <div className='absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50'>
                  <div className='py-2'>
                    <div className='px-4 py-3 dark:text-gray-700'>
                      <div className='flex items-center space-x-2 mb-2'>
                        <Settings className='h-4 w-4 text-gray-500 dark:text-gray-400' />
                        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Theme</span>
                      </div>
                      <ThemeSelector showLabels={false} size='sm' />
                    </div>
                    <button
                      onClick={handleSignOut}
                      className='flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200'
                    >
                      <LogOut className='mr-2 h-4 w-4' />
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