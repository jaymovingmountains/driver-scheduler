import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, date, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow (admin users via Manus OAuth)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Drivers table - stores driver information with phone-based login
 */
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  loginCode: varchar("loginCode", { length: 6 }),
  loginCodeExpiry: timestamp("loginCodeExpiry"),
  status: mysqlEnum("status", ["active", "inactive", "pending"]).default("pending").notNull(),
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

/**
 * Driver availability - tracks which days drivers are available
 */
export const availability = mysqlTable("availability", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  date: date("date").notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("driver_date_idx").on(table.driverId, table.date),
]);

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = typeof availability.$inferInsert;

/**
 * Van list - predefined vans available for assignment
 */
export const vans = mysqlTable("vans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 10 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Van = typeof vans.$inferSelect;
export type InsertVan = typeof vans.$inferInsert;

/**
 * Route assignments - tracks route assignments to drivers
 */
export const routeAssignments = mysqlTable("route_assignments", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  vanId: int("vanId"),
  date: date("date").notNull(),
  routeType: mysqlEnum("routeType", ["regular", "big-box", "out-of-town"]).default("regular").notNull(),
  status: mysqlEnum("status", ["assigned", "completed", "cancelled"]).default("assigned").notNull(),
  notes: text("notes"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RouteAssignment = typeof routeAssignments.$inferSelect;
export type InsertRouteAssignment = typeof routeAssignments.$inferInsert;

/**
 * Notification logs - tracks all sent notifications
 */
export const notificationLogs = mysqlTable("notification_logs", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  type: mysqlEnum("type", ["email", "sms"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["sent", "failed", "pending"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;

/**
 * Driver sessions - for phone/code authentication
 */
export const driverSessions = mysqlTable("driver_sessions", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DriverSession = typeof driverSessions.$inferSelect;
export type InsertDriverSession = typeof driverSessions.$inferInsert;

/**
 * Admin credentials - email-based login with codes
 */
export const adminCredentials = mysqlTable("admin_credentials", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  loginCode: varchar("loginCode", { length: 6 }),
  loginCodeExpiry: timestamp("loginCodeExpiry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminCredential = typeof adminCredentials.$inferSelect;
export type InsertAdminCredential = typeof adminCredentials.$inferInsert;

/**
 * Admin sessions - tracks admin login sessions
 */
export const adminSessions = mysqlTable("admin_sessions", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminSession = typeof adminSessions.$inferSelect;
export type InsertAdminSession = typeof adminSessions.$inferInsert;

/**
 * Login attempts - tracks all login attempts for security monitoring
 */
export const loginAttempts = mysqlTable("login_attempts", {
  id: int("id").autoincrement().primaryKey(),
  attemptType: mysqlEnum("attemptType", ["driver", "admin"]).notNull(),
  identifier: varchar("identifier", { length: 320 }).notNull(), // phone or email
  success: boolean("success").default(false).notNull(),
  failureReason: varchar("failureReason", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv6 compatible
  userAgent: text("userAgent"),
  driverId: int("driverId"), // null if login failed due to unknown user
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

/**
 * Availability reminders - tracks reminder emails sent to drivers
 */
export const availabilityReminders = mysqlTable("availability_reminders", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  reminderDate: date("reminderDate").notNull(), // The date they need to set availability for
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("driver_reminder_date_idx").on(table.driverId, table.reminderDate, table.sentAt),
]);

export type AvailabilityReminder = typeof availabilityReminders.$inferSelect;
export type InsertAvailabilityReminder = typeof availabilityReminders.$inferInsert;


/**
 * Training sessions - tracks training sessions between trainers and trainees
 */
export const trainingSessions = mysqlTable("training_sessions", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(), // The experienced driver doing the training
  traineeId: int("traineeId").notNull(), // The new hire being trained
  date: date("date").notNull(),
  status: mysqlEnum("status", ["scheduled", "in-progress", "completed", "cancelled"]).default("scheduled").notNull(),
  confidenceRating: int("confidenceRating"), // 1-10 rating
  improvementAreas: text("improvementAreas"), // JSON array of improvement areas
  trainerNotes: text("trainerNotes"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrainingSession = typeof trainingSessions.$inferSelect;
export type InsertTrainingSession = typeof trainingSessions.$inferInsert;

/**
 * Training checklist items - individual checklist items for training
 */
export const trainingChecklistItems = mysqlTable("training_checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  category: mysqlEnum("category", [
    "mml-yard",
    "warehouse",
    "on-road-delivery",
    "on-road-apartments",
    "on-road-businesses",
    "on-road-first-attempts",
    "on-road-pickups"
  ]).notNull(),
  itemKey: varchar("itemKey", { length: 100 }).notNull(), // Unique key for the checklist item
  itemLabel: varchar("itemLabel", { length: 255 }).notNull(), // Display label
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrainingChecklistItem = typeof trainingChecklistItems.$inferSelect;
export type InsertTrainingChecklistItem = typeof trainingChecklistItems.$inferInsert;


/**
 * Driver agreements - tracks signed independent contractor agreements
 */
export const driverAgreements = mysqlTable("driver_agreements", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull().unique(), // One agreement per driver
  agreementVersion: varchar("agreementVersion", { length: 20 }).notNull(),
  signatureData: text("signatureData").notNull(), // Base64 encoded signature image
  signedAt: timestamp("signedAt").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv6 compatible
  userAgent: text("userAgent"),
  pdfUrl: text("pdfUrl"), // URL to the signed PDF in S3
  emailSentAt: timestamp("emailSentAt"), // When the signed copy was emailed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DriverAgreement = typeof driverAgreements.$inferSelect;
export type InsertDriverAgreement = typeof driverAgreements.$inferInsert;

/**
 * Agreement reminders - tracks reminder emails sent to drivers who haven't signed
 */
export const agreementReminders = mysqlTable("agreement_reminders", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgreementReminder = typeof agreementReminders.$inferSelect;
export type InsertAgreementReminder = typeof agreementReminders.$inferInsert;
