import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { User, Mail, Key, Image, Trash2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfileProps {
  onBack?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onBack }) => {
  const { user, refreshUser, signOut } = useAuth();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setUsername(user.username || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.updateName(fullName);
      await refreshUser();
      setSuccess(t('profile.nameUpdated'));
    } catch (err: any) {
      setError(err.message || t('profile.updateNameFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (username.length < 3) {
      setError(t('profile.usernameTooShort'));
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError(t('profile.usernameInvalid'));
      setLoading(false);
      return;
    }

    try {
      await apiClient.updateUsername(username);
      await refreshUser();
      setSuccess(t('profile.usernameUpdated'));
    } catch (err: any) {
      setError(err.message || t('profile.updateUsernameFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError(t('profile.passwordTooShort'));
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordsDoNotMatch'));
      setLoading(false);
      return;
    }

    try {
      await apiClient.updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(t('profile.passwordUpdated'));
    } catch (err: any) {
      setError(err.message || t('profile.updatePasswordFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.updateAvatar(avatarUrl);
      await refreshUser();
      setSuccess(t('profile.avatarUpdated'));
    } catch (err: any) {
      setError(err.message || t('profile.updateAvatarFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiClient.deleteAccount();
      signOut();
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('buttons.backToDashboard')}
          </button>
        )}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('profile.subtitle')}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Mail className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.emailAddress')}</h2>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-700 dark:text-gray-300">{user?.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('profile.emailCannotBeChanged')}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.fullNameLabel')}</h2>
            </div>
            <form onSubmit={handleUpdateName}>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('profile.placeholders.fullName')}
                required
                minLength={2}
              />
              <Button type="submit" disabled={loading} className="mt-4">
                {loading ? t('buttons.loading') : t('profile.updateName')}
              </Button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.usernameLabel')}</h2>
            </div>
            <form onSubmit={handleUpdateUsername}>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('profile.placeholders.username')}
                minLength={3}
                maxLength={50}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t('profile.usernameHelp')}
              </p>
              <Button type="submit" disabled={loading} className="mt-4">
                {loading ? t('buttons.loading') : t('profile.updateUsername')}
              </Button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Image className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.avatarLabel')}</h2>
            </div>
            <form onSubmit={handleUpdateAvatar}>
              <div className="mb-4">
                {avatarUrl && (
                  <div className="mb-4">
                    <img
                      src={avatarUrl}
                      alt={t('profile.avatarPreviewAlt')}
                      className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                    />
                  </div>
                )}
                <Input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder={t('profile.placeholders.avatarUrl')}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? t('buttons.loading') : t('profile.updateAvatar')}
              </Button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Key className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.changePassword')}</h2>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.currentPassword')}
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('profile.placeholders.currentPassword')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.newPassword')}
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('profile.placeholders.newPassword')}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.confirmNewPassword')}
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('profile.placeholders.confirmNewPassword')}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? t('buttons.loading') : t('profile.changePassword')}
              </Button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-6">
            <div className="flex items-center mb-4">
              <Trash2 className="h-5 w-5 text-red-500 mr-2" />
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">{t('profile.dangerZone')}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('profile.deleteNotice')}
            </p>
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              {t('profile.deleteAccount')}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('profile.deleteAccountTitle')}
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                {t('profile.deleteWarningTitle')}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {t('profile.deleteWarning')}
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
            >
              {t('profile.deleteAccount')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};