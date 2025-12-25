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
 * Admin credentials - simple username/password for admin login
 */
export const adminCredentials = mysqlTable("admin_credentials", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
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
