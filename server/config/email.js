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