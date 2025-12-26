/**
 * Availability Reminder Job
 * 
 * This job runs every 6 hours and sends reminder emails to drivers
 * who haven't set their availability for dates within 24-48 hours.
 */

import { 
  getDriversNeedingAvailabilityReminder, 
  recordAvailabilityReminder,
  getUpcomingDatesNeedingAvailability 
} from '../db';
import { sendAvailabilityReminder } from '../notifications';

export interface ReminderResult {
  date: string;
  driversReminded: number;
  driversFailed: number;
  details: Array<{
    driverId: number;
    driverName: string;
    email: string;
    success: boolean;
  }>;
}

/**
 * Run the availability reminder job
 * Checks for drivers who need to set availability for upcoming dates
 * and sends them reminder emails
 */
export async function runAvailabilityReminderJob(): Promise<ReminderResult[]> {
  console.log('[AvailabilityReminder] Starting reminder job...');
  
  const results: ReminderResult[] = [];
  const upcomingDates = getUpcomingDatesNeedingAvailability();
  
  console.log(`[AvailabilityReminder] Checking dates: ${upcomingDates.join(', ')}`);
  
  for (const targetDate of upcomingDates) {
    const result: ReminderResult = {
      date: targetDate,
      driversReminded: 0,
      driversFailed: 0,
      details: [],
    };
    
    try {
      // Get drivers who need reminders for this date
      const driversNeedingReminder = await getDriversNeedingAvailabilityReminder(targetDate);
      
      console.log(`[AvailabilityReminder] Found ${driversNeedingReminder.length} drivers needing reminder for ${targetDate}`);
      
      for (const driver of driversNeedingReminder) {
        if (!driver.email) {
          console.log(`[AvailabilityReminder] Skipping driver ${driver.id} (${driver.name}) - no email`);
          continue;
        }
        
        try {
          // Send reminder email
          const success = await sendAvailabilityReminder(
            driver.email,
            driver.name,
            targetDate
          );
          
          if (success) {
            // Record that we sent a reminder
            await recordAvailabilityReminder(driver.id, targetDate);
            result.driversReminded++;
            console.log(`[AvailabilityReminder] Sent reminder to ${driver.name} (${driver.email}) for ${targetDate}`);
          } else {
            result.driversFailed++;
            console.error(`[AvailabilityReminder] Failed to send reminder to ${driver.name} (${driver.email})`);
          }
          
          result.details.push({
            driverId: driver.id,
            driverName: driver.name,
            email: driver.email,
            success,
          });
        } catch (error) {
          result.driversFailed++;
          console.error(`[AvailabilityReminder] Error sending reminder to ${driver.name}:`, error);
          result.details.push({
            driverId: driver.id,
            driverName: driver.name,
            email: driver.email,
            success: false,
          });
        }
      }
    } catch (error) {
      console.error(`[AvailabilityReminder] Error processing date ${targetDate}:`, error);
    }
    
    results.push(result);
  }
  
  const totalReminded = results.reduce((sum, r) => sum + r.driversReminded, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.driversFailed, 0);
  
  console.log(`[AvailabilityReminder] Job complete. Sent ${totalReminded} reminders, ${totalFailed} failed.`);
  
  return results;
}
