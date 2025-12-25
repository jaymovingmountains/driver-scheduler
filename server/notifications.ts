import { createNotificationLog, updateNotificationLog, getDriverById } from './db';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TEXTBELT_API_KEY = process.env.TEXTBELT_API_KEY || 'textbelt'; // 'textbelt' is the free tier key

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendSmsParams {
  to: string;
  message: string;
}

/**
 * Send email via Resend API
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Driver Scheduler <noreply@resend.dev>',
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Email] Failed to send:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Email] Error:', error);
    return false;
  }
}

/**
 * Send SMS via Textbelt API (free tier: 1 SMS/day per IP)
 */
export async function sendSms({ to, message }: SendSmsParams): Promise<boolean> {
  try {
    // Format phone number (remove non-digits, ensure country code)
    let phone = to.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '1' + phone; // Add US country code
    }

    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        message,
        key: TEXTBELT_API_KEY,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      console.error('[SMS] Failed to send:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SMS] Error:', error);
    return false;
  }
}

/**
 * Send notification to driver via email and/or SMS
 */
export async function notifyDriver(
  driverId: number,
  subject: string,
  message: string,
  options: { email?: boolean; sms?: boolean } = { email: true, sms: true }
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const driver = await getDriverById(driverId);
  if (!driver) {
    console.error('[Notify] Driver not found:', driverId);
    return { emailSent: false, smsSent: false };
  }

  let emailSent = false;
  let smsSent = false;

  // Send email if driver has email and email is enabled
  if (options.email && driver.email) {
    const logId = await createNotificationLog({
      driverId,
      type: 'email',
      subject,
      message,
      status: 'pending',
    });

    emailSent = await sendEmail({
      to: driver.email,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">${subject}</h2>
          <p style="color: #333; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Driver Scheduling System</p>
        </div>
      `,
    });

    await updateNotificationLog(logId, {
      status: emailSent ? 'sent' : 'failed',
      sentAt: emailSent ? new Date() : undefined,
      errorMessage: emailSent ? undefined : 'Failed to send email',
    });
  }

  // Send SMS if driver has phone and SMS is enabled
  if (options.sms && driver.phone) {
    const logId = await createNotificationLog({
      driverId,
      type: 'sms',
      message,
      status: 'pending',
    });

    smsSent = await sendSms({
      to: driver.phone,
      message: `${subject}\n\n${message}`,
    });

    await updateNotificationLog(logId, {
      status: smsSent ? 'sent' : 'failed',
      sentAt: smsSent ? new Date() : undefined,
      errorMessage: smsSent ? undefined : 'Failed to send SMS',
    });
  }

  return { emailSent, smsSent };
}

/**
 * Send route assignment notification
 */
export async function notifyRouteAssignment(
  driverId: number,
  routeType: string,
  date: string,
  vanName?: string
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const routeTypeDisplay = routeType === 'big-box' ? 'Big Box' : 
                           routeType === 'out-of-town' ? 'Out of Town' : 'Regular';

  const subject = `Route Assignment: ${routeTypeDisplay} on ${formattedDate}`;
  const message = `You have been assigned a ${routeTypeDisplay} route on ${formattedDate}.${vanName ? `\n\nAssigned Van: ${vanName}` : ''}\n\nPlease log in to the Driver Portal to view details and confirm.`;

  return notifyDriver(driverId, subject, message);
}

/**
 * Send invitation email to new driver
 */
export async function sendDriverInvitation(
  email: string,
  name: string,
  phone: string,
  loginCode: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured');
    return false;
  }

  const subject = 'Welcome to Driver Scheduling System';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Welcome, ${name}!</h2>
      <p style="color: #333; line-height: 1.6;">You have been invited to join the Driver Scheduling System.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Your Phone Number:</strong> ${phone}</p>
        <p style="margin: 0 0 10px 0;"><strong>Your Login Code:</strong></p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; text-align: center; padding: 10px;">
          ${loginCode}
        </div>
      </div>
      
      <p style="color: #333; line-height: 1.6;">Use your phone number and this code to log in to the Driver Portal.</p>
      <p style="color: #666; font-size: 14px;">This code will expire in 24 hours. After your first login, you can request a new code anytime.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">Driver Scheduling System</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send login code to driver
 */
export async function sendLoginCode(
  phone: string,
  email: string | null,
  loginCode: string
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  let emailSent = false;
  let smsSent = false;

  const message = `Your Driver Portal login code is: ${loginCode}\n\nThis code expires in 10 minutes.`;

  // Try SMS first
  smsSent = await sendSms({ to: phone, message });

  // Also send email if available
  if (email) {
    emailSent = await sendEmail({
      to: email,
      subject: 'Your Login Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Your Login Code</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">
              ${loginCode}
            </div>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `,
    });
  }

  return { emailSent, smsSent };
}
