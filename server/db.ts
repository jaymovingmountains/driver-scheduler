import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  drivers, InsertDriver, Driver,
  availability, InsertAvailability,
  vans, InsertVan,
  routeAssignments, InsertRouteAssignment,
  notificationLogs, InsertNotificationLog,
  driverSessions, InsertDriverSession,
  adminCredentials, InsertAdminCredential,
  adminSessions, InsertAdminSession,
  loginAttempts, InsertLoginAttempt, LoginAttempt,
  availabilityReminders, InsertAvailabilityReminder,
  trainingSessions, InsertTrainingSession, TrainingSession,
  trainingChecklistItems, InsertTrainingChecklistItem, TrainingChecklistItem,
  driverAgreements, InsertDriverAgreement, DriverAgreement,
  agreementReminders, InsertAgreementReminder
} from "../drizzle/schema";
import bcrypt from 'bcryptjs';
import { ENV } from './_core/env';
import { nanoid } from 'nanoid';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER HELPERS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ DRIVER HELPERS ============

export async function createDriver(driver: InsertDriver) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(drivers).values(driver);
  return result[0].insertId;
}

export async function getAllDrivers() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(drivers).orderBy(desc(drivers.createdAt));
}

export async function getDriverById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDriverByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(drivers).where(eq(drivers.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDriver(id: number, data: Partial<InsertDriver>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(drivers).set(data).where(eq(drivers.id, id));
}

export async function deleteDriver(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(drivers).where(eq(drivers.id, id));
}

export async function setDriverLoginCode(driverId: number, code: string, expiryMinutes: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
  await db.update(drivers).set({ 
    loginCode: code, 
    loginCodeExpiry: expiry 
  }).where(eq(drivers.id, driverId));
}

export async function verifyDriverLoginCode(phone: string, code: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(drivers)
    .where(and(
      eq(drivers.phone, phone),
      eq(drivers.loginCode, code)
    ))
    .limit(1);
  
  if (result.length === 0) return null;
  
  const driver = result[0];
  if (!driver.loginCodeExpiry || driver.loginCodeExpiry < new Date()) {
    return null;
  }
  
  // Clear the code after successful verification
  await db.update(drivers).set({ 
    loginCode: null, 
    loginCodeExpiry: null,
    status: 'active'
  }).where(eq(drivers.id, driver.id));
  
  return driver;
}

// ============ DRIVER SESSION HELPERS ============

export async function createDriverSession(driverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  await db.insert(driverSessions).values({
    driverId,
    token,
    expiresAt,
  });
  
  return token;
}

export async function getDriverBySessionToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    driver: drivers,
    session: driverSessions,
  })
    .from(driverSessions)
    .innerJoin(drivers, eq(driverSessions.driverId, drivers.id))
    .where(and(
      eq(driverSessions.token, token),
      gte(driverSessions.expiresAt, new Date())
    ))
    .limit(1);
  
  return result.length > 0 ? result[0].driver : null;
}

export async function deleteDriverSession(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(driverSessions).where(eq(driverSessions.token, token));
}

// ============ AVAILABILITY HELPERS ============

export async function setAvailability(driverId: number, dateStr: string, isAvailable: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const dateObj = new Date(dateStr + 'T00:00:00');
  
  await db.insert(availability).values({
    driverId,
    date: dateObj,
    isAvailable,
  }).onDuplicateKeyUpdate({
    set: { isAvailable, updatedAt: new Date() },
  });
}

export async function getDriverAvailability(driverId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(availability)
    .where(and(
      eq(availability.driverId, driverId),
      sql`${availability.date} >= ${startDate}`,
      sql`${availability.date} <= ${endDate}`
    ))
    .orderBy(availability.date);
}

export async function getAvailableDriversForDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    driver: drivers,
    availability: availability,
  })
    .from(availability)
    .innerJoin(drivers, eq(availability.driverId, drivers.id))
    .where(and(
      sql`${availability.date} = ${date}`,
      eq(availability.isAvailable, true),
      eq(drivers.status, 'active')
    ));
}

// ============ VAN HELPERS ============

export async function getAllVans() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(vans).where(eq(vans.isActive, true)).orderBy(vans.name);
}

export async function createVan(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(vans).values({ name }).onDuplicateKeyUpdate({
    set: { isActive: true },
  });
}

export async function seedVans() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const vanNames = [
    'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
    'Z1', 'Z2', 'Z3', 'Z4', 'Z5',
    'M1'
  ];
  
  for (const name of vanNames) {
    await db.insert(vans).values({ name }).onDuplicateKeyUpdate({
      set: { isActive: true },
    });
  }
}

// ============ ROUTE ASSIGNMENT HELPERS ============

export async function createRouteAssignment(assignment: InsertRouteAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(routeAssignments).values(assignment);
  return result[0].insertId;
}

export async function getRouteAssignmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(routeAssignments).where(eq(routeAssignments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDriverRouteAssignments(driverId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (startDate && endDate) {
    return db.select({
      assignment: routeAssignments,
      van: vans,
    })
      .from(routeAssignments)
      .leftJoin(vans, eq(routeAssignments.vanId, vans.id))
      .where(and(
        eq(routeAssignments.driverId, driverId),
        sql`${routeAssignments.date} >= ${startDate}`,
        sql`${routeAssignments.date} <= ${endDate}`
      ))
      .orderBy(routeAssignments.date);
  }
  
  return db.select({
    assignment: routeAssignments,
    van: vans,
  })
    .from(routeAssignments)
    .leftJoin(vans, eq(routeAssignments.vanId, vans.id))
    .where(eq(routeAssignments.driverId, driverId))
    .orderBy(routeAssignments.date);
}

export async function getAllRouteAssignments(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const baseQuery = db.select({
    assignment: routeAssignments,
    driver: drivers,
    van: vans,
  })
    .from(routeAssignments)
    .innerJoin(drivers, eq(routeAssignments.driverId, drivers.id))
    .leftJoin(vans, eq(routeAssignments.vanId, vans.id));
  
  if (startDate && endDate) {
    return baseQuery
      .where(and(
        sql`${routeAssignments.date} >= ${startDate}`,
        sql`${routeAssignments.date} <= ${endDate}`
      ))
      .orderBy(desc(routeAssignments.date));
  } else if (startDate) {
    return baseQuery
      .where(sql`${routeAssignments.date} >= ${startDate}`)
      .orderBy(desc(routeAssignments.date));
  } else if (endDate) {
    return baseQuery
      .where(sql`${routeAssignments.date} <= ${endDate}`)
      .orderBy(desc(routeAssignments.date));
  }
  
  return baseQuery.orderBy(desc(routeAssignments.date));
}

export async function updateRouteAssignment(id: number, data: Partial<InsertRouteAssignment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(routeAssignments).set(data).where(eq(routeAssignments.id, id));
}

export async function deleteRouteAssignment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(routeAssignments).where(eq(routeAssignments.id, id));
}

export async function getDriverSpecialRoutesThisWeek(driverId: number, routeType: 'big-box' | 'out-of-town', weekStart: string, weekEnd: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(routeAssignments)
    .where(and(
      eq(routeAssignments.driverId, driverId),
      eq(routeAssignments.routeType, routeType),
      sql`${routeAssignments.date} >= ${weekStart}`,
      sql`${routeAssignments.date} <= ${weekEnd}`
    ));
}

// ============ NOTIFICATION HELPERS ============

export async function createNotificationLog(log: InsertNotificationLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(notificationLogs).values(log);
  return result[0].insertId;
}

export async function updateNotificationLog(id: number, data: Partial<InsertNotificationLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notificationLogs).set(data).where(eq(notificationLogs.id, id));
}

export async function getNotificationLogs(driverId?: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  if (driverId) {
    return db.select().from(notificationLogs)
      .where(eq(notificationLogs.driverId, driverId))
      .orderBy(desc(notificationLogs.createdAt))
      .limit(limit);
  }
  
  return db.select().from(notificationLogs)
    .orderBy(desc(notificationLogs.createdAt))
    .limit(limit);
}


// ============ ADMIN AUTH HELPERS ============

// Hardcoded admin email - only this email can access admin dashboard
export const ADMIN_EMAIL = "jay@movingmountainslogistics.com";

export async function getOrCreateAdmin() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if admin exists
  const existing = await db.select().from(adminCredentials)
    .where(eq(adminCredentials.email, ADMIN_EMAIL))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Create admin if doesn't exist
  const result = await db.insert(adminCredentials).values({
    email: ADMIN_EMAIL,
  });
  
  const newAdmin = await db.select().from(adminCredentials)
    .where(eq(adminCredentials.id, result[0].insertId))
    .limit(1);
  
  return newAdmin[0];
}

export async function getAdminByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(adminCredentials)
    .where(eq(adminCredentials.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setAdminLoginCode(adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
  const loginCodeExpiry = new Date();
  loginCodeExpiry.setMinutes(loginCodeExpiry.getMinutes() + 15); // 15 minute expiry
  
  await db.update(adminCredentials)
    .set({ loginCode, loginCodeExpiry })
    .where(eq(adminCredentials.id, adminId));
  
  return loginCode;
}

export async function verifyAdminLoginCode(email: string, code: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(adminCredentials)
    .where(and(
      eq(adminCredentials.email, email),
      eq(adminCredentials.loginCode, code),
      sql`${adminCredentials.loginCodeExpiry} > NOW()`
    ))
    .limit(1);
  
  if (result.length === 0) return null;
  
  // Clear the login code after successful verification
  await db.update(adminCredentials)
    .set({ loginCode: null, loginCodeExpiry: null })
    .where(eq(adminCredentials.id, result[0].id));
  
  return result[0];
}

export async function createAdminSession(adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const token = nanoid(64);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day session
  
  await db.insert(adminSessions).values({
    adminId,
    token,
    expiresAt,
  });
  
  return token;
}

export async function getAdminBySessionToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    session: adminSessions,
    admin: adminCredentials,
  })
    .from(adminSessions)
    .innerJoin(adminCredentials, eq(adminSessions.adminId, adminCredentials.id))
    .where(and(
      eq(adminSessions.token, token),
      sql`${adminSessions.expiresAt} > NOW()`
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function deleteAdminSession(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(adminSessions).where(eq(adminSessions.token, token));
}

export async function adminExists() {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select().from(adminCredentials).limit(1);
  return result.length > 0;
}

// ============ LOGIN ATTEMPT LOGGING ============

export async function logLoginAttempt(attempt: {
  attemptType: 'driver' | 'admin';
  identifier: string;
  success: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  driverId?: number;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log login attempt: database not available");
    return;
  }
  
  try {
    await db.insert(loginAttempts).values({
      attemptType: attempt.attemptType,
      identifier: attempt.identifier,
      success: attempt.success,
      failureReason: attempt.failureReason || null,
      ipAddress: attempt.ipAddress || null,
      userAgent: attempt.userAgent || null,
      driverId: attempt.driverId || null,
    });
  } catch (error) {
    console.error("[Database] Failed to log login attempt:", error);
  }
}

export async function getLoginAttempts(options?: {
  limit?: number;
  offset?: number;
  attemptType?: 'driver' | 'admin';
  successOnly?: boolean;
  failedOnly?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<LoginAttempt[]> {
  const db = await getDb();
  if (!db) return [];
  
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  
  let query = db.select().from(loginAttempts);
  
  const conditions = [];
  
  if (options?.attemptType) {
    conditions.push(eq(loginAttempts.attemptType, options.attemptType));
  }
  
  if (options?.successOnly) {
    conditions.push(eq(loginAttempts.success, true));
  }
  
  if (options?.failedOnly) {
    conditions.push(eq(loginAttempts.success, false));
  }
  
  if (options?.startDate) {
    conditions.push(gte(loginAttempts.createdAt, new Date(options.startDate)));
  }
  
  if (options?.endDate) {
    conditions.push(lte(loginAttempts.createdAt, new Date(options.endDate)));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  const results = await query
    .orderBy(desc(loginAttempts.createdAt))
    .limit(limit)
    .offset(offset);
  
  return results;
}

export async function getLoginAttemptStats() {
  const db = await getDb();
  if (!db) return { total: 0, successful: 0, failed: 0, recentFailed: 0 };
  
  // Get total counts
  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(loginAttempts);
  const successResult = await db.select({ count: sql<number>`count(*)` }).from(loginAttempts).where(eq(loginAttempts.success, true));
  const failedResult = await db.select({ count: sql<number>`count(*)` }).from(loginAttempts).where(eq(loginAttempts.success, false));
  
  // Get failed attempts in last 24 hours
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const recentFailedResult = await db.select({ count: sql<number>`count(*)` })
    .from(loginAttempts)
    .where(and(
      eq(loginAttempts.success, false),
      gte(loginAttempts.createdAt, oneDayAgo)
    ));
  
  return {
    total: Number(totalResult[0]?.count || 0),
    successful: Number(successResult[0]?.count || 0),
    failed: Number(failedResult[0]?.count || 0),
    recentFailed: Number(recentFailedResult[0]?.count || 0),
  };
}

// ============ AVAILABILITY REMINDER HELPERS ============

/**
 * Get active drivers who haven't set availability for a specific date
 * and haven't been reminded in the last 6 hours
 */
export async function getDriversNeedingAvailabilityReminder(targetDate: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all active drivers with email
  const activeDrivers = await db.select()
    .from(drivers)
    .where(and(
      eq(drivers.status, 'active'),
      sql`${drivers.email} IS NOT NULL AND ${drivers.email} != ''`
    ));
  
  // Get drivers who have set availability for this date
  const driversWithAvailability = await db.select({ driverId: availability.driverId })
    .from(availability)
    .where(sql`${availability.date} = ${targetDate}`);
  
  const driversWithAvailabilityIds = new Set(driversWithAvailability.map(d => d.driverId));
  
  // Get drivers who were reminded in the last 6 hours for this date
  const sixHoursAgo = new Date();
  sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
  
  const recentlyRemindedDrivers = await db.select({ driverId: availabilityReminders.driverId })
    .from(availabilityReminders)
    .where(and(
      sql`${availabilityReminders.reminderDate} = ${targetDate}`,
      gte(availabilityReminders.sentAt, sixHoursAgo)
    ));
  
  const recentlyRemindedIds = new Set(recentlyRemindedDrivers.map(d => d.driverId));
  
  // Filter to drivers who need reminders
  return activeDrivers.filter(driver => 
    !driversWithAvailabilityIds.has(driver.id) && 
    !recentlyRemindedIds.has(driver.id)
  );
}

/**
 * Record that a reminder was sent to a driver for a specific date
 */
export async function recordAvailabilityReminder(driverId: number, reminderDate: string) {
  const db = await getDb();
  if (!db) return;
  
  const dateObj = new Date(reminderDate + 'T00:00:00');
  
  await db.insert(availabilityReminders).values({
    driverId,
    reminderDate: dateObj,
    sentAt: new Date(),
  });
}

/**
 * Get dates that are within 24-48 hours from now (need availability set)
 */
export function getUpcomingDatesNeedingAvailability(): string[] {
  const dates: string[] = [];
  const now = new Date();
  
  // Check dates 24-48 hours from now
  for (let hoursAhead = 24; hoursAhead <= 48; hoursAhead += 24) {
    const futureDate = new Date(now);
    futureDate.setHours(futureDate.getHours() + hoursAhead);
    
    // Format as YYYY-MM-DD
    const dateStr = futureDate.toISOString().split('T')[0];
    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
    }
  }
  
  return dates;
}


// ============ TRAINING HELPERS ============

// Default checklist items for each category
export const TRAINING_CHECKLIST_TEMPLATE = {
  'mml-yard': [
    { key: 'key-location', label: 'Where to get the keys' },
    { key: 'van-exterior', label: 'Van exterior walk-around inspection' },
    { key: 'van-interior', label: 'Van interior features and controls' },
    { key: 'van-safety', label: 'Safety equipment location (fire extinguisher, first aid)' },
    { key: 'van-fuel', label: 'Fuel card and fueling procedures' },
    { key: 'van-parking', label: 'Proper parking and key return procedures' },
  ],
  'warehouse': [
    { key: 'check-in', label: 'Check-in procedures at warehouse' },
    { key: 'scanning', label: 'Package scanning process' },
    { key: 'sorting', label: 'Sorting packages for route efficiency' },
    { key: 'missing-check', label: 'Checking for missing packages' },
    { key: 'load-van', label: 'Proper van loading techniques' },
    { key: 'check-out', label: 'Check-out procedures' },
  ],
  'on-road-delivery': [
    { key: 'navigation', label: 'Using navigation and delivery app' },
    { key: 'delivery-basics', label: 'Basic delivery procedures' },
    { key: 'photo-proof', label: 'Taking delivery photos' },
    { key: 'safe-location', label: 'Finding safe delivery locations' },
    { key: 'customer-interaction', label: 'Customer interaction and communication' },
  ],
  'on-road-apartments': [
    { key: 'apt-access', label: 'Apartment complex access (gates, codes)' },
    { key: 'apt-lockers', label: 'Using package lockers' },
    { key: 'apt-leasing', label: 'Delivering to leasing offices' },
    { key: 'apt-navigation', label: 'Navigating apartment buildings' },
  ],
  'on-road-businesses': [
    { key: 'business-hours', label: 'Business delivery hours awareness' },
    { key: 'business-reception', label: 'Delivering to reception/mail rooms' },
    { key: 'business-signature', label: 'Obtaining signatures when required' },
    { key: 'business-loading', label: 'Using loading docks when available' },
  ],
  'on-road-first-attempts': [
    { key: 'first-attempt-note', label: 'Leaving delivery attempt notices' },
    { key: 'first-attempt-neighbor', label: 'Neighbor delivery options' },
    { key: 'first-attempt-safe', label: 'Finding alternate safe locations' },
    { key: 'first-attempt-reattempt', label: 'Scheduling re-delivery attempts' },
  ],
  'on-road-pickups': [
    { key: 'pickup-schedule', label: 'Understanding pickup schedules' },
    { key: 'pickup-scan', label: 'Scanning pickup packages' },
    { key: 'pickup-verify', label: 'Verifying pickup package counts' },
    { key: 'pickup-secure', label: 'Securing pickup packages in van' },
  ],
};

export type TrainingCategory = keyof typeof TRAINING_CHECKLIST_TEMPLATE;

/**
 * Create a new training session with all checklist items
 */
export async function createTrainingSession(trainerId: number, traineeId: number, date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Create the session
  const result = await db.insert(trainingSessions).values({
    trainerId,
    traineeId,
    date: new Date(date + 'T00:00:00'),
    status: 'scheduled',
  });
  
  const sessionId = result[0].insertId;
  
  // Create all checklist items
  const checklistItems: InsertTrainingChecklistItem[] = [];
  for (const [category, items] of Object.entries(TRAINING_CHECKLIST_TEMPLATE)) {
    for (const item of items) {
      checklistItems.push({
        sessionId,
        category: category as TrainingCategory,
        itemKey: item.key,
        itemLabel: item.label,
        isCompleted: false,
      });
    }
  }
  
  await db.insert(trainingChecklistItems).values(checklistItems);
  
  return sessionId;
}

/**
 * Get a training session by ID with all checklist items
 */
export async function getTrainingSession(sessionId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const sessions = await db.select()
    .from(trainingSessions)
    .where(eq(trainingSessions.id, sessionId))
    .limit(1);
  
  if (sessions.length === 0) return null;
  
  const session = sessions[0];
  
  // Get trainer and trainee info
  const [trainer] = await db.select().from(drivers).where(eq(drivers.id, session.trainerId)).limit(1);
  const [trainee] = await db.select().from(drivers).where(eq(drivers.id, session.traineeId)).limit(1);
  
  // Get checklist items
  const checklistItems = await db.select()
    .from(trainingChecklistItems)
    .where(eq(trainingChecklistItems.sessionId, sessionId));
  
  return {
    ...session,
    trainer,
    trainee,
    checklistItems,
  };
}

/**
 * Get all training sessions with optional filters
 */
export async function getTrainingSessions(options?: {
  trainerId?: number;
  traineeId?: number;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (options?.trainerId) {
    conditions.push(eq(trainingSessions.trainerId, options.trainerId));
  }
  if (options?.traineeId) {
    conditions.push(eq(trainingSessions.traineeId, options.traineeId));
  }
  if (options?.status) {
    conditions.push(eq(trainingSessions.status, options.status));
  }
  
  const sessions = await db.select()
    .from(trainingSessions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(trainingSessions.date))
    .limit(options?.limit || 100);
  
  // Get all unique driver IDs
  const driverIds = new Set<number>();
  sessions.forEach(s => {
    driverIds.add(s.trainerId);
    driverIds.add(s.traineeId);
  });
  
  // Fetch all drivers at once
  const allDrivers = await db.select().from(drivers);
  const driverMap = new Map(allDrivers.map(d => [d.id, d]));
  
  // Enrich sessions with driver info
  return sessions.map(session => ({
    ...session,
    trainer: driverMap.get(session.trainerId),
    trainee: driverMap.get(session.traineeId),
  }));
}

/**
 * Update a training session status
 */
export async function updateTrainingSessionStatus(
  sessionId: number, 
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updates: Partial<TrainingSession> = { status };
  if (status === 'completed') {
    updates.completedAt = new Date();
  }
  
  await db.update(trainingSessions)
    .set(updates)
    .where(eq(trainingSessions.id, sessionId));
}

/**
 * Complete a training session with rating and notes
 */
export async function completeTrainingSession(
  sessionId: number,
  confidenceRating: number,
  improvementAreas: string[],
  trainerNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(trainingSessions)
    .set({
      status: 'completed',
      confidenceRating,
      improvementAreas: JSON.stringify(improvementAreas),
      trainerNotes: trainerNotes || null,
      completedAt: new Date(),
    })
    .where(eq(trainingSessions.id, sessionId));
}

/**
 * Update a checklist item
 */
export async function updateChecklistItem(
  itemId: number,
  isCompleted: boolean,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(trainingChecklistItems)
    .set({
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      notes: notes || null,
    })
    .where(eq(trainingChecklistItems.id, itemId));
}

/**
 * Get training history for a specific driver (as trainee)
 */
export async function getDriverTrainingHistory(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const sessions = await db.select()
    .from(trainingSessions)
    .where(eq(trainingSessions.traineeId, driverId))
    .orderBy(desc(trainingSessions.date));
  
  // Get trainer info for each session
  const allDrivers = await db.select().from(drivers);
  const driverMap = new Map(allDrivers.map(d => [d.id, d]));
  
  return sessions.map(session => ({
    ...session,
    trainer: driverMap.get(session.trainerId),
  }));
}

/**
 * Get checklist items for a session grouped by category
 */
export async function getChecklistItemsByCategory(sessionId: number) {
  const db = await getDb();
  if (!db) return {};
  
  const items = await db.select()
    .from(trainingChecklistItems)
    .where(eq(trainingChecklistItems.sessionId, sessionId));
  
  // Group by category
  const grouped: Record<string, TrainingChecklistItem[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }
  
  return grouped;
}

/**
 * Get training progress stats for a session
 */
export async function getTrainingProgress(sessionId: number) {
  const db = await getDb();
  if (!db) return { total: 0, completed: 0, percentage: 0 };
  
  const items = await db.select()
    .from(trainingChecklistItems)
    .where(eq(trainingChecklistItems.sessionId, sessionId));
  
  const total = items.length;
  const completed = items.filter(i => i.isCompleted).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { total, completed, percentage };
}


// ============ TRAINING ANALYTICS HELPERS ============

/**
 * Get training analytics statistics
 */
export async function getTrainingAnalytics(options?: {
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return {
    totalSessions: 0,
    completedSessions: 0,
    inProgressSessions: 0,
    scheduledSessions: 0,
    averageConfidenceScore: 0,
    improvementAreas: [],
    trainerStats: [],
    monthlyTrend: [],
  };
  
  const conditions = [];
  
  if (options?.startDate) {
    conditions.push(gte(trainingSessions.date, new Date(options.startDate)));
  }
  if (options?.endDate) {
    conditions.push(lte(trainingSessions.date, new Date(options.endDate)));
  }
  
  // Get all sessions within date range
  const sessions = await db.select()
    .from(trainingSessions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  // Calculate totals
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const inProgressSessions = sessions.filter(s => s.status === 'in-progress').length;
  const scheduledSessions = sessions.filter(s => s.status === 'scheduled').length;
  
  // Calculate average confidence score from completed sessions
  const completedWithRatings = sessions.filter(s => s.status === 'completed' && s.confidenceRating !== null);
  const averageConfidenceScore = completedWithRatings.length > 0
    ? completedWithRatings.reduce((sum, s) => sum + (s.confidenceRating || 0), 0) / completedWithRatings.length
    : 0;
  
  // Aggregate improvement areas
  const improvementCounts: Record<string, number> = {};
  sessions.forEach(s => {
    if (s.improvementAreas) {
      try {
        const areas = JSON.parse(s.improvementAreas) as string[];
        areas.forEach(area => {
          improvementCounts[area] = (improvementCounts[area] || 0) + 1;
        });
      } catch (e) {
        // Skip invalid JSON
      }
    }
  });
  
  const improvementAreas = Object.entries(improvementCounts)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);
  
  // Get trainer statistics
  const trainerCounts: Record<number, { completed: number; totalRating: number; ratingCount: number }> = {};
  sessions.forEach(s => {
    if (!trainerCounts[s.trainerId]) {
      trainerCounts[s.trainerId] = { completed: 0, totalRating: 0, ratingCount: 0 };
    }
    if (s.status === 'completed') {
      trainerCounts[s.trainerId].completed++;
      if (s.confidenceRating !== null) {
        trainerCounts[s.trainerId].totalRating += s.confidenceRating;
        trainerCounts[s.trainerId].ratingCount++;
      }
    }
  });
  
  // Get trainer names
  const trainerIds = Object.keys(trainerCounts).map(Number);
  const allDrivers = await db.select().from(drivers);
  const driverMap = new Map(allDrivers.map(d => [d.id, d]));
  
  const trainerStats = trainerIds.map(trainerId => {
    const stats = trainerCounts[trainerId];
    const driver = driverMap.get(trainerId);
    return {
      trainerId,
      trainerName: driver?.name || 'Unknown',
      sessionsCompleted: stats.completed,
      averageRating: stats.ratingCount > 0 
        ? Math.round((stats.totalRating / stats.ratingCount) * 10) / 10 
        : 0,
    };
  }).sort((a, b) => b.sessionsCompleted - a.sessionsCompleted);
  
  // Calculate monthly trend (last 6 months)
  const monthlyTrend: { month: string; completed: number; avgScore: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    
    const monthSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= monthStart && sessionDate <= monthEnd && s.status === 'completed';
    });
    
    const monthAvg = monthSessions.length > 0
      ? monthSessions.reduce((sum, s) => sum + (s.confidenceRating || 0), 0) / monthSessions.length
      : 0;
    
    monthlyTrend.push({
      month: monthName,
      completed: monthSessions.length,
      avgScore: Math.round(monthAvg * 10) / 10,
    });
  }
  
  return {
    totalSessions,
    completedSessions,
    inProgressSessions,
    scheduledSessions,
    averageConfidenceScore: Math.round(averageConfidenceScore * 10) / 10,
    improvementAreas,
    trainerStats,
    monthlyTrend,
  };
}

/**
 * Get confidence score distribution
 */
export async function getConfidenceDistribution() {
  const db = await getDb();
  if (!db) return [];
  
  const sessions = await db.select()
    .from(trainingSessions)
    .where(and(
      eq(trainingSessions.status, 'completed'),
      sql`${trainingSessions.confidenceRating} IS NOT NULL`
    ));
  
  // Count scores 1-10
  const distribution = Array.from({ length: 10 }, (_, i) => ({
    score: i + 1,
    count: sessions.filter(s => s.confidenceRating === i + 1).length,
  }));
  
  return distribution;
}


// ============ DRIVER AGREEMENT HELPERS ============

/**
 * Get agreement status for a driver
 */
export async function getDriverAgreement(driverId: number): Promise<DriverAgreement | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [agreement] = await db.select()
    .from(driverAgreements)
    .where(eq(driverAgreements.driverId, driverId))
    .limit(1);
  
  return agreement || null;
}

/**
 * Create a signed agreement record
 */
export async function createDriverAgreement(data: {
  driverId: number;
  agreementVersion: string;
  signatureData: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<DriverAgreement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const insertData: InsertDriverAgreement = {
    driverId: data.driverId,
    agreementVersion: data.agreementVersion,
    signatureData: data.signatureData,
    signedAt: new Date(),
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  };
  
  await db.insert(driverAgreements).values(insertData);
  
  const [agreement] = await db.select()
    .from(driverAgreements)
    .where(eq(driverAgreements.driverId, data.driverId))
    .limit(1);
  
  return agreement;
}

/**
 * Update agreement with PDF URL after generation
 */
export async function updateAgreementPdfUrl(driverId: number, pdfUrl: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(driverAgreements)
    .set({ pdfUrl })
    .where(eq(driverAgreements.driverId, driverId));
}

/**
 * Mark agreement email as sent
 */
export async function markAgreementEmailSent(driverId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(driverAgreements)
    .set({ emailSentAt: new Date() })
    .where(eq(driverAgreements.driverId, driverId));
}

/**
 * Get all drivers with their agreement status and last reminder sent
 */
export async function getDriversWithAgreementStatus(): Promise<Array<Driver & { hasSigned: boolean; signedAt: Date | null; lastReminderSent: Date | null }>> {
  const db = await getDb();
  if (!db) return [];
  
  const allDrivers = await db.select().from(drivers).where(eq(drivers.status, 'active'));
  const allAgreements = await db.select().from(driverAgreements);
  const allReminders = await db.select().from(agreementReminders);
  
  const agreementMap = new Map(allAgreements.map(a => [a.driverId, a]));
  
  // Get the most recent reminder for each driver
  const reminderMap = new Map<number, Date>();
  for (const reminder of allReminders) {
    const existing = reminderMap.get(reminder.driverId);
    if (!existing || reminder.sentAt > existing) {
      reminderMap.set(reminder.driverId, reminder.sentAt);
    }
  }
  
  return allDrivers.map(driver => ({
    ...driver,
    hasSigned: agreementMap.has(driver.id),
    signedAt: agreementMap.get(driver.id)?.signedAt || null,
    lastReminderSent: reminderMap.get(driver.id) || null,
  }));
}

/**
 * Get drivers who haven't signed the agreement
 */
export async function getDriversWithoutAgreement(): Promise<Driver[]> {
  const db = await getDb();
  if (!db) return [];
  
  const allDrivers = await db.select().from(drivers).where(eq(drivers.status, 'active'));
  const signedDriverIds = (await db.select({ driverId: driverAgreements.driverId }).from(driverAgreements))
    .map(a => a.driverId);
  
  return allDrivers.filter(d => !signedDriverIds.includes(d.id));
}

/**
 * Record an agreement reminder sent
 */
export async function recordAgreementReminder(driverId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(agreementReminders).values({
    driverId,
    sentAt: new Date(),
  });
}

/**
 * Get the last reminder sent to a driver
 */
export async function getLastAgreementReminder(driverId: number): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [reminder] = await db.select()
    .from(agreementReminders)
    .where(eq(agreementReminders.driverId, driverId))
    .orderBy(desc(agreementReminders.sentAt))
    .limit(1);
  
  return reminder?.sentAt || null;
}

/**
 * Check if a driver needs an agreement reminder (last reminder > 6 hours ago or never sent)
 */
export async function needsAgreementReminder(driverId: number): Promise<boolean> {
  const lastReminder = await getLastAgreementReminder(driverId);
  
  if (!lastReminder) return true;
  
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return lastReminder < sixHoursAgo;
}

/**
 * Get agreement statistics for admin dashboard
 */
export async function getAgreementStats(): Promise<{
  totalActiveDrivers: number;
  signedCount: number;
  unsignedCount: number;
  signedPercentage: number;
}> {
  const db = await getDb();
  if (!db) return { totalActiveDrivers: 0, signedCount: 0, unsignedCount: 0, signedPercentage: 0 };
  
  const activeDrivers = await db.select().from(drivers).where(eq(drivers.status, 'active'));
  const signedAgreements = await db.select().from(driverAgreements);
  
  const totalActiveDrivers = activeDrivers.length;
  const signedCount = signedAgreements.length;
  const unsignedCount = totalActiveDrivers - signedCount;
  const signedPercentage = totalActiveDrivers > 0 
    ? Math.round((signedCount / totalActiveDrivers) * 100) 
    : 0;
  
  return { totalActiveDrivers, signedCount, unsignedCount, signedPercentage };
}
