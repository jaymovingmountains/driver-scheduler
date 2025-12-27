import * as db from "../db";
import { sendAgreementReminderEmail } from "../notifications";

/**
 * Run the agreement reminder job
 * Sends reminder emails to drivers who haven't signed the agreement
 * Only sends if the last reminder was more than 6 hours ago
 */
export async function runAgreementReminderJob(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  console.log('[Agreement Reminder] Starting job...');
  
  const results = {
    sent: 0,
    failed: 0,
    skipped: 0,
  };
  
  try {
    // Get all drivers who haven't signed the agreement
    const unsignedDrivers = await db.getDriversWithoutAgreement();
    
    console.log(`[Agreement Reminder] Found ${unsignedDrivers.length} drivers without signed agreement`);
    
    for (const driver of unsignedDrivers) {
      // Check if driver has an email
      if (!driver.email) {
        console.log(`[Agreement Reminder] Skipping ${driver.name} - no email address`);
        results.skipped++;
        continue;
      }
      
      // Check if we need to send a reminder (last reminder > 6 hours ago)
      const needsReminder = await db.needsAgreementReminder(driver.id);
      
      if (!needsReminder) {
        console.log(`[Agreement Reminder] Skipping ${driver.name} - reminder sent within last 6 hours`);
        results.skipped++;
        continue;
      }
      
      // Send the reminder email
      console.log(`[Agreement Reminder] Sending reminder to ${driver.name} (${driver.email})`);
      const success = await sendAgreementReminderEmail(driver.email, driver.name);
      
      if (success) {
        // Record that we sent a reminder
        await db.recordAgreementReminder(driver.id);
        results.sent++;
        console.log(`[Agreement Reminder] Successfully sent to ${driver.name}`);
      } else {
        results.failed++;
        console.log(`[Agreement Reminder] Failed to send to ${driver.name}`);
      }
    }
    
    console.log(`[Agreement Reminder] Job complete: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`);
    return results;
    
  } catch (error) {
    console.error('[Agreement Reminder] Job error:', error);
    return results;
  }
}
