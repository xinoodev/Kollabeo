
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Loader, CheckCircle, XCircle, Mail } from "lucide-react";
import { Button } from "../components/ui/Button";
import { apiClient } from "../lib/api";
import React, { useEffect, useState } from "react";
import { Project } from "../types";

interface AcceptInvitationProps {
    onGoToProject: (project: Project) => void;
    onGoToDashboard: () => void;
}

export const AcceptInvitation: React.FC<AcceptInvitationProps> = ({
    onGoToProject,
    onGoToDashboard
}) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [status, setStatus] = useState<"loading" | "success" | "error" | "needs-auth" | "already-member">("loading");
    const [message, setMessage] = useState("");
    const [projectId, setProjectId] = useState<number | null>(null);
    const [projectName, setProjectName] = useState("");
    const [invitationToken, setInvitationToken] = useState<string | null>(null);
    const [invitationType, setInvitationType] = useState<'email' | 'link' | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const emailToken = urlParams.get("token");
        const linkToken = urlParams.get("link");

        if (!emailToken && !linkToken) {
            setStatus("error");
            setMessage(t('invitations.invalidLink'));
            return;
        }

        const token = emailToken || linkToken;
        const type = emailToken ? 'email' : 'link';

        setInvitationToken(token);
        setInvitationType(type);

        if (!user) {
            setStatus("needs-auth");
            setMessage(t('invitations.loginToAccept'));
            return;
        }

        const acceptInvitation = async () => {
            try {
                if (!token) {
                    setStatus("error");
                    setMessage("Invalid invitation token");
                    return;
                }
                
                const result = type === 'email'
                    ? await apiClient.acceptInvitation(token)
                    : await apiClient.acceptInvitationLink(token);
                
                if (result.alreadyMember) {
                    setStatus("already-member");
                    setMessage(result.message);
                    setProjectId(result.projectId);
                    setProjectName(result.projectName);
                } else {
                    setStatus("success");
                    setMessage(result.message);
                    setProjectId(result.projectId);
                    setProjectName(result.projectName);
                }
            } catch (error: any) {
                setStatus("error");
                setMessage(error.message || t('invitations.acceptFailed'));
            }
        };

        acceptInvitation();
    }, [user]);

    const handleGoToProject = async () => {
        if (projectId) {
            try {
                setStatus("loading");
                setMessage("Loading project...");
                const project = await apiClient.getProject(projectId);
                setTimeout(() => {
                    onGoToProject(project);
                }, 1600);
            } catch (error) {
                console.error('Error loading project:', error);
                setStatus("error");
                setMessage("Failed to load project. Redirecting to dashboard...");
                setTimeout(() => {
                    onGoToDashboard();
                }, 2000);
            }
        }
    };

    const handleLogin = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const emailToken = urlParams.get("token");
        const linkToken = urlParams.get("link");
        const token = emailToken || linkToken;
        const type = emailToken ? 'email' : 'link';

        // Store the invitation details to process after login
        if (token) {
            sessionStorage.setItem('pendingInvitation', token);
            sessionStorage.setItem('pendingInvitationType', type);
        }
        // Clear the URL and go back to auth
        window.history.replaceState({}, '', '/');
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <div className="text-center">
                    {status === "loading" && (
                        <>
                                    <div className="flex justify-center mb-4">
                                        <Loader className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        {t('invitations.processingTitle')}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {t('invitations.processingInfo')}
                                    </p>
                                </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="flex justify-center mb-4">
                                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                            </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    {t('invitations.acceptedTitle')}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-2">
                                    {message}
                                </p>
                            {projectName && (
                                <p className="text-gray-900 dark:text-white font-semibold mb-6">
                                    Welcome to "{projectName}"
                                </p>
                            )}
                            <div className="space-y-3">
                                <Button onClick={handleGoToProject} className="w-full">
                                    {t('invitations.goToProject', { name: projectName })}
                                </Button>
                                <Button onClick={onGoToDashboard} variant="outline" className="w-full">
                                    Go to Dashboard
                                </Button>
                            </div>
                        </>
                    )}

                    {status === "already-member" && (
                        <>
                            <div className="flex justify-center mb-4">
                                <CheckCircle className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('invitations.alreadyMemberTitle')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                                {message}
                            </p>
                            {projectName && (
                                <p className="text-gray-900 dark:text-white font-semibold mb-6">
                                    {t('invitations.projectLabel', { name: projectName })}
                                </p>
                            )}
                            <div className="space-y-3">
                                <Button onClick={handleGoToProject} className="w-full">
                                    Go to "{projectName}"
                                </Button>
                                <Button onClick={onGoToDashboard} variant="outline" className="w-full">
                                    Go to Dashboard
                                </Button>
                            </div>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="flex justify-center mb-4">
                                <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('invitations.errorTitle')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {message}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                {t('invitations.contactOwnerInfo')}
                            </p>
                            <Button onClick={onGoToDashboard} className="w-full">
                                {t('buttons.backToDashboard')}
                            </Button>
                        </>
                    )}

                    {status === "needs-auth" && (
                        <>
                            <div className="flex justify-center mb-4">
                                <Mail className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Login Required
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {message}
                            </p>
                            <Button onClick={handleLogin} className="w-full">
                                Log In to Accept Invitation
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};