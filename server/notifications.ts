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

  const websiteUrl = 'https://driversched.com';
  const subject = 'Welcome to Moving Mountains Logistics Driver Portal';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Welcome, ${name}!</h2>
      <p style="color: #333; line-height: 1.6;">You have been invited to join the Moving Mountains Logistics Driver Portal.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Your Phone Number:</strong> ${phone}</p>
        <p style="margin: 0 0 10px 0;"><strong>Your Login Code:</strong></p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; text-align: center; padding: 10px;">
          ${loginCode}
        </div>
      </div>
      
      <p style="color: #333; line-height: 1.6;">To get started:</p>
      <ol style="color: #333; line-height: 1.8;">
        <li>Go to <a href="${websiteUrl}" style="color: #ea580c; font-weight: bold;">${websiteUrl}</a></li>
        <li>Click "Sign In"</li>
        <li>Enter your phone number: <strong>${phone}</strong></li>
        <li>Enter your login code shown above</li>
      </ol>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${websiteUrl}" style="display: inline-block; background: linear-gradient(to right, #f97316, #dc2626); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Go to Driver Portal</a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">Moving Mountains Logistics - Driver Scheduling System</p>
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


/**
 * Send availability reminder email to driver
 */
export async function sendAvailabilityReminder(
  email: string,
  name: string,
  targetDate: string
): Promise<boolean> {
  if (!email) {
    console.warn('[Email] No email address provided for availability reminder');
    return false;
  }

  const websiteUrl = 'https://driversched.com';
  const formattedDate = new Date(targetDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `Reminder: Set Your Availability for ${formattedDate}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Hi ${name},</h2>
      
      <p style="color: #333; line-height: 1.6;">
        This is a friendly reminder that you haven't set your availability for <strong>${formattedDate}</strong>.
      </p>
      
      <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px 20px; margin: 20px 0;">
        <p style="margin: 0; color: #9a3412;">
          <strong>⏰ Please update your availability soon!</strong><br>
          Routes are assigned based on driver availability. Setting your availability helps us plan routes efficiently.
        </p>
      </div>
      
      <p style="color: #333; line-height: 1.6;">To set your availability:</p>
      <ol style="color: #333; line-height: 1.8;">
        <li>Go to <a href="${websiteUrl}" style="color: #ea580c; font-weight: bold;">${websiteUrl}</a></li>
        <li>Sign in with your phone number</li>
        <li>Click on the "Availability" tab</li>
        <li>Select the days you're available to work</li>
        <li>Click "Save Availability"</li>
      </ol>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${websiteUrl}" style="display: inline-block; background: linear-gradient(to right, #f97316, #dc2626); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Set My Availability</a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">Moving Mountains Logistics - Driver Scheduling System</p>
      <p style="color: #999; font-size: 11px;">You're receiving this reminder because you haven't set your availability for an upcoming work day.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}


/**
 * Send signed agreement copy to driver
 */
export async function sendSignedAgreementEmail(
  email: string,
  name: string,
  signedAt: Date,
  pdfUrl?: string
): Promise<boolean> {
  if (!email) {
    console.warn('[Email] No email address provided for signed agreement');
    return false;
  }

  const websiteUrl = 'https://driversched.com';
  const formattedDate = signedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = 'Your Signed Independent Contractor Agreement - Moving Mountains Logistics';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f97316;">
        <h1 style="color: #f97316; margin: 0; font-size: 28px; font-weight: bold;">MML</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Moving Mountains Logistics</p>
      </div>
      
      <h2 style="color: #1a1a1a; margin-top: 30px;">Agreement Signed Successfully</h2>
      
      <p style="color: #333; line-height: 1.6;">
        Hi ${name},
      </p>
      
      <p style="color: #333; line-height: 1.6;">
        Thank you for signing the Independent Contractor Driver Services Agreement. 
        This email confirms that your agreement has been successfully recorded.
      </p>
      
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; color: #166534; font-weight: bold;">
          ✓ Agreement Details
        </p>
        <table style="width: 100%; color: #333;">
          <tr>
            <td style="padding: 5px 0;"><strong>Signed By:</strong></td>
            <td style="padding: 5px 0;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Date & Time:</strong></td>
            <td style="padding: 5px 0;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Agreement Version:</strong></td>
            <td style="padding: 5px 0;">1.0</td>
          </tr>
        </table>
      </div>
      
      ${pdfUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${pdfUrl}" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Download Signed Agreement (PDF)</a>
      </div>
      ` : ''}
      
      <p style="color: #333; line-height: 1.6;">
        You can view your agreement status anytime by logging into the Driver Portal at 
        <a href="${websiteUrl}" style="color: #ea580c; font-weight: bold;">${websiteUrl}</a>.
      </p>
      
      <p style="color: #333; line-height: 1.6;">
        If you have any questions about the agreement, please contact your dispatcher.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0 20px 0;">
      <p style="color: #666; font-size: 12px; text-align: center;">
        Moving Mountains Logistics<br>
        Driver Scheduling System
      </p>
      <p style="color: #999; font-size: 11px; text-align: center;">
        This is an automated confirmation email. Please keep this for your records.
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send agreement reminder to driver who hasn't signed
 */
export async function sendAgreementReminderEmail(
  email: string,
  name: string
): Promise<boolean> {
  if (!email) {
    console.warn('[Email] No email address provided for agreement reminder');
    return false;
  }

  const websiteUrl = 'https://driversched.com';

  const subject = 'Action Required: Sign Your Independent Contractor Agreement';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f97316;">
        <h1 style="color: #f97316; margin: 0; font-size: 28px; font-weight: bold;">MML</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Moving Mountains Logistics</p>
      </div>
      
      <h2 style="color: #1a1a1a; margin-top: 30px;">Reminder: Agreement Signature Required</h2>
      
      <p style="color: #333; line-height: 1.6;">
        Hi ${name},
      </p>
      
      <p style="color: #333; line-height: 1.6;">
        This is a friendly reminder that you have not yet signed the Independent Contractor Driver Services Agreement. 
        <strong>This agreement is required to continue driving with Moving Mountains Logistics.</strong>
      </p>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>⚠️ Action Required</strong><br>
          Please sign the agreement as soon as possible to avoid any interruption to your route assignments.
        </p>
      </div>
      
      <p style="color: #333; line-height: 1.6;">To sign the agreement:</p>
      <ol style="color: #333; line-height: 1.8;">
        <li>Go to <a href="${websiteUrl}" style="color: #ea580c; font-weight: bold;">${websiteUrl}</a></li>
        <li>Sign in with your phone number</li>
        <li>Click on the "Agreement" tab</li>
        <li>Read through the agreement carefully</li>
        <li>Draw your signature and click "Sign Agreement"</li>
      </ol>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${websiteUrl}" style="display: inline-block; background: linear-gradient(to right, #f97316, #dc2626); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Sign Agreement Now</a>
      </div>
      
      <p style="color: #333; line-height: 1.6;">
        If you have any questions about the agreement, please contact your dispatcher.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0 20px 0;">
      <p style="color: #666; font-size: 12px; text-align: center;">
        Moving Mountains Logistics<br>
        Driver Scheduling System
      </p>
      <p style="color: #999; font-size: 11px; text-align: center;">
        You're receiving this reminder because you haven't signed the required Independent Contractor Agreement.
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}
