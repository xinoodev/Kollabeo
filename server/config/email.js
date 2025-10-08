import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const createTransporter = () => {
    if (process.env.NODE_ENV === 'development') {
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: 'ethereal.user@ethereal.email',
                pass: 'ethereal.pass'
            }
        });
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });
}

export const transporter = createTransporter();

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
                        Thanks you for signing up! To get started with Kollabeo and access all features,
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

                <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB">
                    <p style="color: #6B7280" font-size: 14px; margin: 0;>
                        © ${new Date().getFullYear()} Kollabeo. All rights reserved.
                    </p>
                </div>
            </div>
        `
    })
};

// Send verification email
export const sendVerificationEmail = async (email, verificationToken, userName) => {
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify?token=${verificationToken}`;

    const { subject, html } = emailTemplate.verification(verificationUrl, userName);

    try {
        const info = await transporter.sendMail({
            from: `"Kollabeo" <${process.env.EMAIL_FROM} || noreply@kollabeo.com>`,
            to: email,
            subject,
            html
        });

        console.log('Verification email sent:', info.messageId);

        if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending verification email:', error);
        return { success: false, error: error.message };
    }
};