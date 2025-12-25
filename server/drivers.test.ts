import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getAllDrivers: vi.fn(),
  getDriverById: vi.fn(),
  getDriverByPhone: vi.fn(),
  createDriver: vi.fn(),
  updateDriver: vi.fn(),
  deleteDriver: vi.fn(),
  setDriverLoginCode: vi.fn(),
  verifyDriverLoginCode: vi.fn(),
  createDriverSession: vi.fn(),
  getDriverBySessionToken: vi.fn(),
  deleteDriverSession: vi.fn(),
  getAllVans: vi.fn(),
  seedVans: vi.fn(),
  getAllRouteAssignments: vi.fn(),
  createRouteAssignment: vi.fn(),
  updateRouteAssignment: vi.fn(),
  deleteRouteAssignment: vi.fn(),
  getRouteAssignmentById: vi.fn(),
  getDriverAvailability: vi.fn(),
  getDriverSpecialRoutesThisWeek: vi.fn(),
  getAvailableDriversForDate: vi.fn(),
  getNotificationLogs: vi.fn(),
  setAvailability: vi.fn(),
  getDb: vi.fn(),
  getDriverRouteAssignments: vi.fn(),
  // Admin auth functions
  adminExists: vi.fn(),
  createAdminCredential: vi.fn(),
  verifyAdminPassword: vi.fn(),
  createAdminSession: vi.fn(),
  getAdminBySessionToken: vi.fn(),
  deleteAdminSession: vi.fn(),
  updateAdminPassword: vi.fn(),
}));

// Mock notifications
vi.mock("./notifications", () => ({
  notifyDriver: vi.fn().mockResolvedValue({ emailSent: true, smsSent: true }),
  notifyRouteAssignment: vi.fn().mockResolvedValue({ emailSent: true, smsSent: true }),
  sendDriverInvitation: vi.fn().mockResolvedValue(true),
  sendLoginCode: vi.fn().mockResolvedValue({ emailSent: true, smsSent: true }),
}));

import * as db from "./db";

const ADMIN_COOKIE_NAME = 'admin_session';

function createAdminContext(): TrpcContext {
  // Mock admin session token
  const mockToken = 'mock-admin-session-token';
  
  // Setup mock to return admin when session token is provided
  vi.mocked(db.getAdminBySessionToken).mockResolvedValue({
    admin: { id: 1, username: 'admin' },
    session: { id: 1, adminId: 1, token: mockToken, expiresAt: new Date(Date.now() + 86400000), createdAt: new Date() }
  });

  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: { [ADMIN_COOKIE_NAME]: mockToken },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createDriverContext(driverId: number = 1): TrpcContext {
  const mockToken = 'mock-driver-session-token';
  
  vi.mocked(db.getDriverBySessionToken).mockResolvedValue({
    id: driverId,
    name: 'Test Driver',
    phone: '1234567890',
    email: 'driver@test.com',
    status: 'active',
    loginCode: null,
    loginCodeExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: { driver_session: mockToken },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("drivers router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("drivers.list", () => {
    it("returns all drivers for admin", async () => {
      const mockDrivers = [
        { id: 1, name: "Driver 1", phone: "1234567890", email: "d1@test.com", status: "active" },
        { id: 2, name: "Driver 2", phone: "0987654321", email: "d2@test.com", status: "pending" },
      ];
      vi.mocked(db.getAllDrivers).mockResolvedValue(mockDrivers as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.drivers.list();
      expect(result).toEqual(mockDrivers);
      expect(db.getAllDrivers).toHaveBeenCalled();
    });

    it("throws unauthorized for non-admin", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.drivers.list()).rejects.toThrow("Admin login required");
    });
  });

  describe("drivers.invite", () => {
    it("creates a new driver with login code", async () => {
      vi.mocked(db.getDriverByPhone).mockResolvedValue(undefined);
      vi.mocked(db.createDriver).mockResolvedValue(1);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.drivers.invite({
        name: "New Driver",
        phone: "5551234567",
        email: "new@test.com",
      });

      expect(result.success).toBe(true);
      expect(result.driverId).toBe(1);
      expect(result.loginCode).toMatch(/^\d{6}$/);
      expect(db.createDriver).toHaveBeenCalled();
    });

    it("throws error if phone already exists", async () => {
      vi.mocked(db.getDriverByPhone).mockResolvedValue({
        id: 1,
        name: "Existing",
        phone: "5551234567",
      } as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.drivers.invite({
          name: "New Driver",
          phone: "5551234567",
        })
      ).rejects.toThrow("Phone number already registered");
    });
  });

  describe("drivers.delete", () => {
    it("deletes a driver", async () => {
      vi.mocked(db.deleteDriver).mockResolvedValue(undefined);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.drivers.delete({ id: 1 });
      expect(result.success).toBe(true);
      expect(db.deleteDriver).toHaveBeenCalledWith(1);
    });
  });
});

describe("driverAuth router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("driverAuth.requestCode", () => {
    it("sends login code to registered driver", async () => {
      vi.mocked(db.getDriverByPhone).mockResolvedValue({
        id: 1,
        name: "Test Driver",
        phone: "1234567890",
        email: "test@test.com",
      } as any);
      vi.mocked(db.setDriverLoginCode).mockResolvedValue(undefined);

      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.driverAuth.requestCode({ phone: "1234567890" });
      expect(result.success).toBe(true);
    });

    it("throws error for unregistered phone", async () => {
      vi.mocked(db.getDriverByPhone).mockResolvedValue(undefined);

      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.driverAuth.requestCode({ phone: "9999999999" })
      ).rejects.toThrow("Phone number not registered");
    });
  });

  describe("driverAuth.verifyCode", () => {
    it("verifies valid code and creates session", async () => {
      vi.mocked(db.verifyDriverLoginCode).mockResolvedValue({
        id: 1,
        name: "Test Driver",
        phone: "1234567890",
      } as any);
      vi.mocked(db.createDriverSession).mockResolvedValue("session-token");

      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.driverAuth.verifyCode({
        phone: "1234567890",
        code: "123456",
      });

      expect(result.success).toBe(true);
      expect(result.driver.name).toBe("Test Driver");
    });

    it("throws error for invalid code", async () => {
      vi.mocked(db.verifyDriverLoginCode).mockResolvedValue(null);

      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.driverAuth.verifyCode({
          phone: "1234567890",
          code: "000000",
        })
      ).rejects.toThrow("Invalid or expired code");
    });
  });
});

describe("routes router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("routes.assign", () => {
    it("throws error for less than 24-hour notice", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Use today's date (less than 24 hours)
      const today = new Date().toISOString().split("T")[0];

      await expect(
        caller.routes.assign({
          driverId: 1,
          date: today,
          routeType: "regular",
        })
      ).rejects.toThrow("Route assignments require at least 24 hours advance notice");
    });

    it("throws error for duplicate special route in same week", async () => {
      // Mock that driver already has a big-box route this week
      vi.mocked(db.getDriverSpecialRoutesThisWeek).mockResolvedValue([
        { id: 1, routeType: "big-box" } as any,
      ]);
      vi.mocked(db.getDriverAvailability).mockResolvedValue([
        { isAvailable: true } as any,
      ]);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Use a date more than 24 hours from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateStr = futureDate.toISOString().split("T")[0];

      await expect(
        caller.routes.assign({
          driverId: 1,
          date: dateStr,
          routeType: "big-box",
        })
      ).rejects.toThrow("Driver already has a Big Box route assigned this week");
    });

    it("throws error if driver not available", async () => {
      vi.mocked(db.getDriverSpecialRoutesThisWeek).mockResolvedValue([]);
      vi.mocked(db.getDriverAvailability).mockResolvedValue([]);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateStr = futureDate.toISOString().split("T")[0];

      await expect(
        caller.routes.assign({
          driverId: 1,
          date: dateStr,
          routeType: "regular",
        })
      ).rejects.toThrow("Driver is not available on this date");
    });
  });

  describe("routes.list", () => {
    it("returns all route assignments for admin", async () => {
      const mockRoutes = [
        {
          assignment: { id: 1, driverId: 1, routeType: "regular", date: new Date() },
          driver: { id: 1, name: "Driver 1" },
          van: null,
        },
      ];
      vi.mocked(db.getAllRouteAssignments).mockResolvedValue(mockRoutes as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.routes.list();
      expect(result).toEqual(mockRoutes);
    });
  });
});

describe("vans router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("vans.list", () => {
    it("returns all vans", async () => {
      const mockVans = [
        { id: 1, name: "T1" },
        { id: 2, name: "T2" },
      ];
      vi.mocked(db.getAllVans).mockResolvedValue(mockVans as any);

      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.vans.list();
      expect(result).toEqual(mockVans);
    });
  });
});

describe("driverPortal router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("driverPortal.myRoutes", () => {
    it("returns routes for authenticated driver", async () => {
      const mockRoutes = [
        {
          assignment: { id: 1, driverId: 1, routeType: "regular", date: new Date() },
          driver: { id: 1, name: "Test Driver" },
          van: { id: 1, name: "T1" },
        },
      ];
      vi.mocked(db.getDriverRouteAssignments).mockResolvedValue(mockRoutes as any);

      const ctx = createDriverContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.driverPortal.myRoutes({});
      expect(result).toEqual(mockRoutes);
    });

    it("throws unauthorized for non-driver", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.driverPortal.myRoutes({})).rejects.toThrow("Driver login required");
    });
  });

  describe("driverPortal.setAvailability", () => {
    it("sets availability for authenticated driver", async () => {
      vi.mocked(db.setAvailability).mockResolvedValue(undefined);

      const ctx = createDriverContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.driverPortal.setAvailability({
        date: "2025-01-15",
        isAvailable: true,
      });

      expect(result.success).toBe(true);
      expect(db.setAvailability).toHaveBeenCalledWith(1, "2025-01-15", true);
    });
  });
});

describe("adminAuth router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("adminAuth.exists", () => {
    it("returns true if admin exists", async () => {
      vi.mocked(db.adminExists).mockResolvedValue(true);

      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.adminAuth.exists();
      expect(result).toBe(true);
    });

    it("returns false if no admin", async () => {
      vi.mocked(db.adminExists).mockResolvedValue(false);

      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.adminAuth.exists();
      expect(result).toBe(false);
    });
  });

  describe("adminAuth.login", () => {
    it("logs in with valid credentials", async () => {
      vi.mocked(db.verifyAdminPassword).mockResolvedValue({ id: 1, username: "admin" } as any);
      vi.mocked(db.createAdminSession).mockResolvedValue("session-token");

      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.adminAuth.login({
        username: "admin",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.admin.username).toBe("admin");
    });

    it("throws error for invalid credentials", async () => {
      vi.mocked(db.verifyAdminPassword).mockResolvedValue(null);

      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.adminAuth.login({
          username: "admin",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid username or password");
    });
  });

  describe("adminAuth.logout", () => {
    it("logs out successfully", async () => {
      vi.mocked(db.deleteAdminSession).mockResolvedValue(undefined);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.adminAuth.logout();
      expect(result.success).toBe(true);
    });
  });
});
