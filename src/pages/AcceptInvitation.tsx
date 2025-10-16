import React, { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { Loader, CheckCircle, XCircle, Mail } from "lucide-react";

interface AcceptInvitationProps {
    onGoToProject: (projectId: number) => void;
    onGoToDashboard: () => void;
}

export const AcceptInvitation: React.FC<AcceptInvitationProps> = ({
    onGoToProject,
    onGoToDashboard
}) => {
    const { user } = useAuth();
    const [status, setStatus] = useState<"loading" | "success" | "error" | "needs-auth">("loading");
    const [message, setMessage] = useState("");
    const [projectId, setProjectId] = useState<number | null>(null);
    const [projectName, setProjectName] = useState("");
    const [invitationToken, setInvitationToken] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if (!token) {
            setStatus("error");
            setMessage("Invalid invitation link");
            return;
        }

        setInvitationToken(token);

        if (!user) {
            setStatus("needs-auth");
            setMessage('Please log in to accept this invitation');
            return;
        }

        const acceptInvitation = async () => {
            try {
                const result = await apiClient.acceptInvitation(token);
                setStatus("success");
                setMessage(result.message);
                setProjectId(result.projectId);
                setProjectName(result.projectName);
            } catch (error: any) {
                setStatus("error");
                setMessage(error.message || "Failed to accept invitation");
            }
        };

        acceptInvitation();
    }, [user]);

    const handleGoToProject = () => {
        if (projectId) {
            onGoToProject(projectId);
        }
    };

    const handleLogin = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        // Store the invitation token to process after login
        if (token) {
            sessionStorage.setItem('pendingInvitation', token);
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
                                Processing Invitation
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Please wait while we process your invitation...
                            </p>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="flex justify-center mb-4">
                                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Invitation Accepted
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
                                    Go to Project
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
                                Invitation Failed
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {message}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                You can still access the project if you're already a member. Otherwise, please contact the project owner.
                            </p>
                            <Button onClick={onGoToDashboard} className="w-full">
                                Go to Dashboard
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