import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { ThemeSelector } from "../ui/ThemeSelector";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { CheckCircle, AlertCircle, Loader2, Lock } from "lucide-react";

interface ResetPasswordPageProps {
    token: string;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token }) => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const { resetPassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus("error");
            setMessage("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setStatus("error");
            setMessage("Password must be at least 6 characters long");
            return;
        }

        setStatus("loading");
        setMessage("");

        try {
            const { error } = await resetPassword(token, password);
            if (error) {
                setStatus("error");
                setMessage(error.message);
            } else {
                setStatus("success");
                setMessage("Your password has been reset successfully! You will be redirected to the dashboard.");
                setTimeout(() => {
                    window.history.replaceState({}, "", "/");
                    window.location.reload();
                }, 2000);
            }
        } catch (error: any) {
            setStatus("error");
            setMessage("Failed to reset password. The link may be invalid or expired.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 transition-colors duration-300">
            <div className="max-w-md w-full space-y-8">
                <div className="flex justify-center">
                    <ThemeSelector showLabels={false} size="sm" />
                </div>

                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                        <Lock className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Enter your new password below
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border dark:border-gray-700 transition-colors duration-300">
                    {status === "success" ? (
                        <div className="text-center py-6">
                            <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Password Reset Successful
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                {message}
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {message && status === "error" && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        {message}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <Input
                                    label="New Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Enter new password"
                                    autoFocus
                                />

                                <Input
                                    label="Confirm Password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="Confirm new password"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={status === "loading"}
                            >
                                {status === "loading" ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resetting password...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        Reset Password
                                    </>
                                )}
                            </Button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => window.location.href = "/"}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};