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
  adminSessions, InsertAdminSession
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
