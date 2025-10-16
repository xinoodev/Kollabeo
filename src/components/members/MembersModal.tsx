import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Project, ProjectMember } from '../../types';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Trash2, Shield, User as UserIcon, Crown } from 'lucide-react';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export const MembersModal: React.FC<MembersModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailPreview, setEmailPreview] = useState('');
  const { user } = useAuth();

  const currentUserMember = members.find(m => m.user_id === user?.id);
  const isOwner = project.owner_id === user?.id;
  const isAdmin = currentUserMember?.role === 'admin' || isOwner;

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, project.id]);

  const fetchMembers = async () => {
    try {
      const data = await apiClient.getMembers(project.id);
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEmailPreview('');
    setLoading(true);

    try {
      const result = await apiClient.sendInvitation(project.id, email, role);
      const invitedEmail = email;
      setEmail('');
      setRole('member');

      if (result.emailPreview) {
        setSuccess(`Invitation sent to ${invitedEmail}! (Test mode)`);
        setEmailPreview(result.emailPreview);
      } else {
        setSuccess(`Invitation sent successfully to ${invitedEmail}! The user will receive an email to join the project.`);
      }
    } catch (error: any) {
      setError(error.message || 'Error sending invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: number, newRole: 'admin' | 'member') => {
    try {
      await apiClient.updateMemberRole(memberId, newRole);
      await fetchMembers();
    } catch (error: any) {
      console.error('Error updating role:', error);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await apiClient.removeMember(memberId);
      await fetchMembers();
    } catch (error: any) {
      console.error('Error removing member:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Members" size="lg">
      <div className="space-y-6">
        {isAdmin && (
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <UserPlus className="h-4 w-4" />
              <span>Invite New Member</span>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <p className="font-medium">{success}</p>
                {emailPreview && (
                  <a
                    href={emailPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs underline hover:no-underline"
                  >
                    Preview email
                  </a>
                )}
              </div>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              An invitation email will be sent to the user. They must accept the invitation to join the project.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <Button type="submit" disabled={loading} fullWidth>
              {loading ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </form>
        )}

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Members ({members.length})
          </h4>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {members.map((member) => (
              <div
                key={member.id || `owner-${member.user_id}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {(member.username || member.full_name)?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {member.username || member.full_name}
                      {member.user_id === user?.id && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {member.email}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {isAdmin && member.role !== 'owner' && member.user_id !== user?.id ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value as 'admin' | 'member')}
                        className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                        {getRoleIcon(member.role)}
                        <span className="capitalize">{member.role}</span>
                      </span>
                    )}

                    {isAdmin && member.role !== 'owner' && member.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    {member.user_id === user?.id && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200 text-xs"
                        title="Leave project"
                      >
                        Leave
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p><strong>Owner:</strong> Full control over the project</p>
            <p><strong>Admin:</strong> Can manage members and project settings</p>
            <p><strong>Member:</strong> Can view and edit tasks</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};