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
  getDriverAvailability: vi.fn(),
  getDriverSpecialRoutesThisWeek: vi.fn(),
  getAvailableDriversForDate: vi.fn(),
  getNotificationLogs: vi.fn(),
}));

// Mock notifications
vi.mock("./notifications", () => ({
  notifyDriver: vi.fn().mockResolvedValue({ emailSent: true, smsSent: true }),
  notifyRouteAssignment: vi.fn().mockResolvedValue({ emailSent: true, smsSent: true }),
  sendDriverInvitation: vi.fn().mockResolvedValue(true),
  sendLoginCode: vi.fn().mockResolvedValue({ emailSent: true, smsSent: true }),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
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

function createNonAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
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

function createPublicContext(): TrpcContext {
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

describe("drivers router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("drivers.list", () => {
    it("returns list of drivers for admin", async () => {
      const mockDrivers = [
        { id: 1, name: "John Doe", phone: "5551234567", status: "active" },
        { id: 2, name: "Jane Smith", phone: "5559876543", status: "pending" },
      ];
      vi.mocked(db.getAllDrivers).mockResolvedValue(mockDrivers as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.drivers.list();

      expect(result).toEqual(mockDrivers);
      expect(db.getAllDrivers).toHaveBeenCalled();
    });

    it("throws FORBIDDEN for non-admin users", async () => {
      const ctx = createNonAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.drivers.list()).rejects.toThrow("Admin access required");
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
        phone: "5551112222",
        email: "driver@example.com",
      });

      expect(result.success).toBe(true);
      expect(result.driverId).toBe(1);
      expect(result.loginCode).toMatch(/^\d{6}$/);
      expect(db.createDriver).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Driver",
          phone: "5551112222",
          email: "driver@example.com",
          status: "pending",
        })
      );
    });

    it("throws CONFLICT if phone already exists", async () => {
      vi.mocked(db.getDriverByPhone).mockResolvedValue({
        id: 1,
        name: "Existing",
        phone: "5551112222",
      } as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.drivers.invite({
          name: "New Driver",
          phone: "5551112222",
        })
      ).rejects.toThrow("Phone number already registered");
    });
  });

  describe("drivers.update", () => {
    it("updates driver information", async () => {
      vi.mocked(db.updateDriver).mockResolvedValue(undefined);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.drivers.update({
        id: 1,
        name: "Updated Name",
        status: "active",
      });

      expect(result.success).toBe(true);
      expect(db.updateDriver).toHaveBeenCalledWith(1, {
        name: "Updated Name",
        status: "active",
      });
    });
  });

  describe("drivers.delete", () => {
    it("removes a driver", async () => {
      vi.mocked(db.deleteDriver).mockResolvedValue(undefined);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.drivers.delete({ id: 1 });

      expect(result.success).toBe(true);
      expect(db.deleteDriver).toHaveBeenCalledWith(1);
    });
  });
});

describe("vans router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("vans.list", () => {
    it("returns list of vans (public access)", async () => {
      const mockVans = [
        { id: 1, name: "T1", isActive: true },
        { id: 2, name: "T2", isActive: true },
        { id: 3, name: "Z1", isActive: true },
      ];
      vi.mocked(db.getAllVans).mockResolvedValue(mockVans as any);

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.vans.list();

      expect(result).toEqual(mockVans);
    });
  });
});

describe("routes router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("routes.assign", () => {
    it("creates route assignment with 24-hour notice", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      vi.mocked(db.getDriverSpecialRoutesThisWeek).mockResolvedValue([]);
      vi.mocked(db.getDriverAvailability).mockResolvedValue([
        { id: 1, driverId: 1, date: futureDate, isAvailable: true } as any,
      ]);
      vi.mocked(db.createRouteAssignment).mockResolvedValue(1);
      vi.mocked(db.getAllVans).mockResolvedValue([]);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.routes.assign({
        driverId: 1,
        date: futureDateStr,
        routeType: "regular",
      });

      expect(result.success).toBe(true);
      expect(result.assignmentId).toBe(1);
    });

    it("throws error for less than 24-hour notice", async () => {
      const today = new Date().toISOString().split("T")[0];

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.routes.assign({
          driverId: 1,
          date: today,
          routeType: "regular",
        })
      ).rejects.toThrow("Route assignments require at least 24 hours advance notice");
    });

    it("throws error for duplicate special route in same week", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      vi.mocked(db.getDriverSpecialRoutesThisWeek).mockResolvedValue([
        { id: 1, driverId: 1, routeType: "big-box" } as any,
      ]);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.routes.assign({
          driverId: 1,
          date: futureDateStr,
          routeType: "big-box",
        })
      ).rejects.toThrow("Driver already has a Big Box route assigned this week");
    });

    it("throws error if driver not available", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      vi.mocked(db.getDriverSpecialRoutesThisWeek).mockResolvedValue([]);
      vi.mocked(db.getDriverAvailability).mockResolvedValue([]);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.routes.assign({
          driverId: 1,
          date: futureDateStr,
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
          driver: { id: 1, name: "John" },
          van: { id: 1, name: "T1" },
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

describe("driverAuth router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("driverAuth.requestCode", () => {
    it("sends login code to registered driver", async () => {
      vi.mocked(db.getDriverByPhone).mockResolvedValue({
        id: 1,
        name: "John",
        phone: "5551234567",
        email: "john@example.com",
      } as any);
      vi.mocked(db.setDriverLoginCode).mockResolvedValue(undefined);

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.driverAuth.requestCode({ phone: "5551234567" });

      expect(result.success).toBe(true);
      expect(db.setDriverLoginCode).toHaveBeenCalled();
    });

    it("throws NOT_FOUND for unregistered phone", async () => {
      vi.mocked(db.getDriverByPhone).mockResolvedValue(undefined);

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.driverAuth.requestCode({ phone: "5559999999" })
      ).rejects.toThrow("Phone number not registered");
    });
  });

  describe("driverAuth.verifyCode", () => {
    it("creates session for valid code", async () => {
      vi.mocked(db.verifyDriverLoginCode).mockResolvedValue({
        id: 1,
        name: "John",
        phone: "5551234567",
      } as any);
      vi.mocked(db.createDriverSession).mockResolvedValue("session-token-123");

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.driverAuth.verifyCode({
        phone: "5551234567",
        code: "123456",
      });

      expect(result.success).toBe(true);
      expect(result.driver.name).toBe("John");
      expect(ctx.res.cookie).toHaveBeenCalled();
    });

    it("throws UNAUTHORIZED for invalid code", async () => {
      vi.mocked(db.verifyDriverLoginCode).mockResolvedValue(null);

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.driverAuth.verifyCode({
          phone: "5551234567",
          code: "000000",
        })
      ).rejects.toThrow("Invalid or expired code");
    });
  });
});
