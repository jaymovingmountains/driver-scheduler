import { createNotificationLog, updateNotificationLog, getDriverById } from './db';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
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
        from: 'Driver Scheduler <noreply@movingmountainslogistics.com>',
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

    console.log('[Email] Sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('[Email] Error:', error);
    return false;
  }
}

/**
 * Send notification to driver via email
 */
export async function notifyDriver(
  driverId: number,
  subject: string,
  message: string
): Promise<{ emailSent: boolean }> {
  const driver = await getDriverById(driverId);
  if (!driver) {
    console.error('[Notify] Driver not found:', driverId);
    return { emailSent: false };
  }

  let emailSent = false;

  // Send email if driver has email
  if (driver.email) {
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
  } else {
    console.warn('[Notify] Driver has no email address:', driverId);
  }

  return { emailSent };
}

/**
 * Send route assignment notification
 */
export async function notifyRouteAssignment(
  driverId: number,
  routeType: string,
  date: string,
  vanName?: string
): Promise<{ emailSent: boolean }> {
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
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">Driver Scheduling System</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send login code to driver via email
 */
export async function sendLoginCode(
  email: string,
  loginCode: string
): Promise<boolean> {
  if (!email) {
    console.warn('[Email] No email address provided for login code');
    return false;
  }

  return sendEmail({
    to: email,
    subject: 'Your Driver Portal Login Code',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Your Login Code</h2>
        <p style="color: #333; line-height: 1.6;">Use this code to log in to the Driver Portal:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">
            ${loginCode}
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Driver Scheduling System</p>
      </div>
    `,
  });
}

/**
 * Send weekly availability summary email to admin
 */
export async function sendWeeklyAvailabilitySummary(
  adminEmail: string,
  weekData: {
    weekStart: string;
    weekEnd: string;
    drivers: Array<{
      name: string;
      availability: Array<{ date: string; isAvailable: boolean }>;
    }>;
  }
): Promise<boolean> {
  if (!adminEmail) {
    console.warn('[Email] No admin email provided for weekly summary');
    return false;
  }

  const weekStartDate = new Date(weekData.weekStart + 'T12:00:00');
  const weekEndDate = new Date(weekData.weekEnd + 'T12:00:00');
  
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Generate day headers
  const days: string[] = [];
  const dayDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    dayDates.push(d.toISOString().split('T')[0]);
  }

  // Build driver rows
  const driverRows = weekData.drivers.map(driver => {
    const cells = dayDates.map(date => {
      const avail = driver.availability.find(a => {
        const availDate = typeof a.date === 'string' ? a.date : new Date(a.date).toISOString().split('T')[0];
        return availDate === date;
      });
      if (avail?.isAvailable) {
        return '<td style="text-align: center; padding: 8px; background: #dcfce7; color: #166534;">✓</td>';
      } else if (avail && !avail.isAvailable) {
        return '<td style="text-align: center; padding: 8px; background: #fee2e2; color: #991b1b;">✗</td>';
      }
      return '<td style="text-align: center; padding: 8px; background: #f5f5f5; color: #999;">-</td>';
    }).join('');
    return `<tr><td style="padding: 8px; font-weight: 500; border-right: 1px solid #e5e5e5;">${driver.name}</td>${cells}</tr>`;
  }).join('');

  // Count available drivers per day
  const availableCounts = dayDates.map(date => {
    return weekData.drivers.filter(driver => 
      driver.availability.some(a => {
        const availDate = typeof a.date === 'string' ? a.date : new Date(a.date).toISOString().split('T')[0];
        return availDate === date && a.isAvailable;
      })
    ).length;
  });

  const summaryRow = availableCounts.map(count => 
    `<td style="text-align: center; padding: 8px; font-weight: bold; background: #f0f9ff; color: #0369a1;">${count}</td>`
  ).join('');

  const subject = `Weekly Driver Availability: ${formatDate(weekStartDate)} - ${formatDate(weekEndDate)}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Weekly Driver Availability Summary</h2>
      <p style="color: #666; margin-bottom: 20px;">${formatDate(weekStartDate)} - ${formatDate(weekEndDate)}</p>
      
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e5e5; border-right: 1px solid #e5e5e5;">Driver</th>
            ${days.map(day => `<th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e5e5;">${day}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${driverRows}
          <tr style="border-top: 2px solid #e5e5e5;">
            <td style="padding: 8px; font-weight: bold; border-right: 1px solid #e5e5e5;">Total Available</td>
            ${summaryRow}
          </tr>
        </tbody>
      </table>
      
      <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #666;">
          <span style="display: inline-block; width: 20px; height: 20px; background: #dcfce7; border-radius: 4px; vertical-align: middle; margin-right: 5px;"></span> Available
          <span style="display: inline-block; width: 20px; height: 20px; background: #fee2e2; border-radius: 4px; vertical-align: middle; margin-left: 15px; margin-right: 5px;"></span> Not Available
          <span style="display: inline-block; width: 20px; height: 20px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; vertical-align: middle; margin-left: 15px; margin-right: 5px;"></span> Not Set
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">Driver Scheduling System</p>
    </div>
  `;

  return sendEmail({ to: adminEmail, subject, html });
}
