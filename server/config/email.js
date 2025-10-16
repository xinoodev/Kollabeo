import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const createTestTransporter = async () => {
    console.log('🧪 Creating test transporter for development...');
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('📧 Test account created:', {
        user: testAccount.user,
        smtp: testAccount.smtp
    });
    
    return nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });
};

const createTransporter = async () => {
    // Check if we should use real SMTP even in development
    const useRealSMTP = process.env.USE_REAL_SMTP === 'true' || process.env.NODE_ENV === 'production';
    
    if (useRealSMTP && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
        console.log('🏭 Using real SMTP configuration...');
        console.log('📧 SMTP Config:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER ? '***' : 'NOT SET'
        });

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT == 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });

        try {
            await transporter.verify();
            console.log('✅ Real SMTP transporter verified successfully');
            return transporter;
        } catch (error) {
            console.error('❌ Real SMTP transporter verification failed:', error);
            if (process.env.NODE_ENV === 'production') {
                throw error; // Don't fall back in production
            }
            console.log('🔄 Falling back to test account...');
        }
    }

    // Use test account for development or if real SMTP failed
    return await createTestTransporter();
};

let transporter;

const getTransporter = async () => {
    if (!transporter) {
        transporter = await createTransporter();
    }
    return transporter;
};

// Email template
export const emailTemplate = {
    verification: (verificationUrl, userName) => ({
        subject: 'Verify your Kollabeo account',
        html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Kollabeo</h1>
                    <p style="color: #E0E7FF; margin: 10px 0 0 0;">Collaborative Task Management</p>
                </div>

                <div style="padding: 40px 20px; background: #ffffff;">
                    <h2 style="color: #1F2937; margin: 0 0 20px 0;">Welcome to Kollabeo, ${userName}!</h2>

                    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                        Thank you for signing up! To get started with Kollabeo and access all features,
                        please verify your email address by clicking the button below:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>

                    <p style="color: #6B7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                        If the button doesn't work, please copy and paste the following link into your browser:<br>
                        <a href="${verificationUrl}" style="color: #3B82F6; word-break: break-all;">${verificationUrl}</a>
                    </p>

                    <p style="color: #6B7280; font-size: 14px; margin: 30px 0 0 0;">
                        This verification link will expire in 24 hours. If you didn't create an account with Kollabeo,
                        you can safely ignore this email.
                    </p>
                </div>

                <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                    <p style="color: #6B7280; font-size: 14px; margin: 0;">
                        © ${new Date().getFullYear()} Kollabeo. All rights reserved.
                    </p>
                </div>
            </div>
        `
    }),
    passwordReset: (resetUrl, userName) => ({
        subject: 'Reset your Kollabeo password',
        html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Kollabeo</h1>
                    <p style="color: #E0E7FF; margin: 10px 0 0 0;">Collaborative Task Management</p>
                </div>

                <div style="padding: 40px 20px; background: #ffffff;">
                    <h2 style="color: #1F2937; margin: 0 0 20px 0;">Reset Your Password</h2>

                    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                        Hi ${userName},
                    </p>

                    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                        We received a request to reset your password for your Kollabeo account.
                        Click the button below to create a new password:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                            Reset Password
                        </a>
                    </div>

                    <p style="color: #6B7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                        If the button doesn't work, please copy and paste the following link into your browser:<br>
                        <a href="${resetUrl}" style="color: #3B82F6; word-break: break-all;">${resetUrl}</a>
                    </p>

                    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0;">
                        <p style="color: #92400E; margin: 0; font-weight: 600;">
                            Important Security Notice
                        </p>
                        <p style="color: #B45309; margin: 8px 0 0 0; font-size: 14px;">
                            This password reset link will expire in 1 hour. If you didn't request a password reset,
                            please ignore this email or contact support if you have concerns about your account security.
                        </p>
                    </div>
                </div>

                <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                    <p style="color: #6B7280; font-size: 14px; margin: 0;">
                        © ${new Date().getFullYear()} Kollabeo. All rights reserved.
                    </p>
                </div>
            </div>
        `
    }),
    passwordChanged: (userName) => ({
        subject: 'Your Kollabeo password has been changed',
        html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Kollabeo</h1>
                    <p style="color: #E0E7FF; margin: 10px 0 0 0;">Collaborative Task Management</p>
                </div>

                <div style="padding: 40px 20px; background: #ffffff;">
                    <h2 style="color: #1F2937; margin: 0 0 20px 0;">Password Changed Successfully</h2>

                    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                        Hi ${userName},
                    </p>

                    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                        This is a confirmation that your password has been successfully changed.
                    </p>

                    <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px; margin: 20px 0;">
                        <p style="color: #065F46; margin: 0; font-weight: 600;">
                            ✓ Password Updated
                        </p>
                        <p style="color: #047857; margin: 8px 0 0 0; font-size: 14px;">
                            Your password was changed on ${new Date().toLocaleString('en-US', {
                                dateStyle: 'full',
                                timeStyle: 'short'
                            })}.
                        </p>
                    </div>

                    <p style="color: #4B5563; line-height: 1.6; margin: 20px 0 0 0;">
                        If you didn't make this change, please contact support immediately or reset your password.
                    </p>
                </div>

                <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                    <p style="color: #6B7280; font-size: 14px; margin: 0;">
                        © ${new Date().getFullYear()} Kollabeo. All rights reserved.
                    </p>
                </div>
            </div>
        `
    }),
    projectInvitation: (invitationUrl, projectName, inviterName, role) => ({
        subject: `You've been invited to join "${projectName}" on Kollabeo`,
        html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Kollabeo</h1>
                    <p style="color: #E0E7FF; margin: 10px 0 0 0;">Collaborative Task Management</p>
                </div>

                <div style="padding: 40px 20px; background: #ffffff;">
                    <h2 style="color: #1F2937; margin: 0 0 20px 0;">Project Invitation</h2>

                    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                        <strong>${inviterName}</strong> has invited you to join the project <strong>"${projectName}"</strong>
                        as a <strong>${role}</strong>.
                    </p>

                    <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0;">
                        <p style="color: #1E40AF; margin: 0; font-weight: 600;">
                            Project: ${projectName}
                        </p>
                        <p style="color: #3B82F6; margin: 8px 0 0 0; font-size: 14px;">
                            Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
                        </p>
                    </div>

                    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                        Click the button below to accept the invitation and join the project:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${invitationUrl}" style="background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                            Accept Invitation
                        </a>
                    </div>

                    <p style="color: #6B7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                        If the button doesn't work, please copy and paste the following link into your browser:<br>
                        <a href="${invitationUrl}" style="color: #3B82F6; word-break: break-all;">${invitationUrl}</a>
                    </p>

                    <p style="color: #6B7280; font-size: 14px; margin: 30px 0 0 0;">
                        This invitation will expire in 7 days. If you didn't expect this invitation,
                        you can safely ignore this email.
                    </p>
                </div>

                <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                    <p style="color: #6B7280; font-size: 14px; margin: 0;">
                        © ${new Date().getFullYear()} Kollabeo. All rights reserved.
                    </p>
                </div>
            </div>
        `
    })
};

// Test email connectivity
export const testEmailConnection = async () => {
    try {
        const emailTransporter = await getTransporter();
        const verified = await emailTransporter.verify();
        
        console.log('✅ Email connection test successful:', verified);
        return { success: true, verified };
    } catch (error) {
        console.error('❌ Email connection test failed:', error);
        return { success: false, error: error.message };
    }
};

// Send verification email
export const sendVerificationEmail = async (email, token, userName) => {
    try {
        console.log('🔄 Attempting to send verification email to:', email);
        console.log('📧 Environment:', process.env.NODE_ENV);
        console.log('🔧 USE_REAL_SMTP:', process.env.USE_REAL_SMTP);

        const emailTransporter = await getTransporter();
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

        console.log('🔗 Verification URL:', verificationUrl);

        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@kollabeo.com',
            to: email,
            ...emailTemplate.verification(verificationUrl, userName)
        };

        console.log('📬 Mail options:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        const info = await emailTransporter.sendMail(mailOptions);

        console.log('✅ Email sent successfully:', {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response
        });

        // Check if we're using test email service
        const isTestMode = info.envelope && info.envelope.from && info.envelope.from.includes('ethereal.email');

        if (isTestMode) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('🧪 TEST MODE: Email sent to test service');
            console.log('👀 Preview URL: %s', previewUrl);
            console.log('⚠️  NOTE: This is a test email. Real emails are NOT being sent.');
            console.log('📧 To send real emails, configure SMTP settings and set USE_REAL_SMTP=true');

            return {
                success: true,
                messageId: info.messageId,
                previewUrl,
                isTestMode: true,
                message: 'Email sent to test service. Check preview URL to see the email content.'
            };
        } else {
            console.log('✅ Real email sent successfully to:', email);
            console.log('📧 Message ID:', info.messageId);

            return {
                success: true,
                messageId: info.messageId,
                isTestMode: false,
                message: 'Real email sent successfully'
            };
        }

    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        return { success: false, error: error.message };
    }
};

// Send password changed notification email
export const sendPasswordChangedEmail = async (email, userName) => {
    try {
        console.log('🔄 Attempting to send password changed email to:', email);

        const emailTransporter = await getTransporter();

        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@kollabeo.com',
            to: email,
            ...emailTemplate.passwordChanged(userName)
        };

        console.log('📬 Sending password changed notification:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        const info = await emailTransporter.sendMail(mailOptions);

        console.log('✅ Password changed email sent:', {
            messageId: info.messageId,
            accepted: info.accepted
        });

        const isTestMode = info.envelope && info.envelope.from && info.envelope.from.includes('ethereal.email');

        if (isTestMode) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('🧪 TEST MODE: Password changed email sent to test service');
            console.log('👀 Preview URL: %s', previewUrl);

            return {
                success: true,
                messageId: info.messageId,
                previewUrl,
                isTestMode: true
            };
        } else {
            console.log('✅ Real password changed email sent to:', email);

            return {
                success: true,
                messageId: info.messageId,
                isTestMode: false
            };
        }

    } catch (error) {
        console.error('❌ Error sending password changed email:', error);
        return { success: false, error: error.message };
    }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, token, userName) => {
    try {
        console.log('🔄 Attempting to send password reset email to:', email);

        const emailTransporter = await getTransporter();
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

        console.log('🔗 Password reset URL:', resetUrl);

        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@kollabeo.com',
            to: email,
            ...emailTemplate.passwordReset(resetUrl, userName)
        };

        console.log('📬 Sending password reset email:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        const info = await emailTransporter.sendMail(mailOptions);

        console.log('✅ Password reset email sent:', {
            messageId: info.messageId,
            accepted: info.accepted
        });

        const isTestMode = info.envelope && info.envelope.from && info.envelope.from.includes('ethereal.email');

        if (isTestMode) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('🧪 TEST MODE: Password reset email sent to test service');
            console.log('👀 Preview URL: %s', previewUrl);

            return {
                success: true,
                messageId: info.messageId,
                previewUrl,
                isTestMode: true
            };
        } else {
            console.log('✅ Real password reset email sent to:', email);

            return {
                success: true,
                messageId: info.messageId,
                isTestMode: false
            };
        }

    } catch (error) {
        console.error('❌ Error sending password reset email:', error);
        return { success: false, error: error.message };
    }
};

// Send project invitation email
export const sendProjectInvitationEmail = async (email, token, projectName, inviterName, role) => {
    try {
        console.log('🔄 Attempting to send project invitation email to:', email);

        const emailTransporter = await getTransporter();
        const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invitation?token=${token}`;

        console.log('🔗 Invitation URL:', invitationUrl);

        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@kollabeo.com',
            to: email,
            ...emailTemplate.projectInvitation(invitationUrl, projectName, inviterName, role)
        };

        console.log('📬 Sending project invitation email:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        const info = await emailTransporter.sendMail(mailOptions);

        console.log('✅ Project invitation email sent:', {
            messageId: info.messageId,
            accepted: info.accepted
        });

        const isTestMode = info.envelope && info.envelope.from && info.envelope.from.includes('ethereal.email');

        if (isTestMode) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('🧪 TEST MODE: Project invitation email sent to test service');
            console.log('👀 Preview URL: %s', previewUrl);

            return {
                success: true,
                messageId: info.messageId,
                previewUrl,
                isTestMode: true
            };
        } else {
            console.log('✅ Real project invitation email sent to:', email);

            return {
                success: true,
                messageId: info.messageId,
                isTestMode: false
            };
        }

    } catch (error) {
        console.error('❌ Error sending project invitation email:', error);
        return { success: false, error: error.message };
    }
};