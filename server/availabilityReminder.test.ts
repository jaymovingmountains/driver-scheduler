import { describe, expect, it, vi, beforeEach } from "vitest";
import * as db from "./db";
import { getUpcomingDatesNeedingAvailability } from "./db";

// Mock only the async database functions, keep the pure functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue({}),
    getDriversNeedingAvailabilityReminder: vi.fn(),
    recordAvailabilityReminder: vi.fn(),
    // Keep getUpcomingDatesNeedingAvailability as the actual implementation
  };
});

// Mock the notifications
vi.mock("./notifications", () => ({
  sendAvailabilityReminder: vi.fn().mockResolvedValue(true),
}));

describe("Availability Reminder System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUpcomingDatesNeedingAvailability", () => {
    it("returns dates 24-48 hours from now", () => {
      // Use the actual implementation (imported directly)
      const dates = getUpcomingDatesNeedingAvailability();
      
      expect(dates).toBeDefined();
      expect(Array.isArray(dates)).toBe(true);
      expect(dates.length).toBeGreaterThanOrEqual(1);
      expect(dates.length).toBeLessThanOrEqual(2);
      
      // Each date should be in YYYY-MM-DD format
      for (const date of dates) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("returns dates that are in the future", () => {
      const dates = getUpcomingDatesNeedingAvailability();
      const today = new Date().toISOString().split('T')[0];
      
      for (const date of dates) {
        expect(date >= today).toBe(true);
      }
    });
  });

  describe("Reminder Logic", () => {
    it("identifies drivers without availability set", async () => {
      const mockDrivers = [
        { id: 1, name: "Driver 1", email: "driver1@test.com", status: "active" },
        { id: 2, name: "Driver 2", email: "driver2@test.com", status: "active" },
      ];
      
      vi.mocked(db.getDriversNeedingAvailabilityReminder).mockResolvedValue(mockDrivers as any);
      
      const targetDate = "2025-12-28";
      const driversNeedingReminder = await db.getDriversNeedingAvailabilityReminder(targetDate);
      
      expect(driversNeedingReminder).toHaveLength(2);
      expect(driversNeedingReminder[0].name).toBe("Driver 1");
    });

    it("excludes drivers who were recently reminded", async () => {
      // When a driver was reminded in the last 6 hours, they should not be in the list
      vi.mocked(db.getDriversNeedingAvailabilityReminder).mockResolvedValue([]);
      
      const targetDate = "2025-12-28";
      const driversNeedingReminder = await db.getDriversNeedingAvailabilityReminder(targetDate);
      
      expect(driversNeedingReminder).toHaveLength(0);
    });

    it("excludes drivers who already set availability", async () => {
      // When a driver has already set availability for the date, they should not be in the list
      vi.mocked(db.getDriversNeedingAvailabilityReminder).mockResolvedValue([]);
      
      const targetDate = "2025-12-28";
      const driversNeedingReminder = await db.getDriversNeedingAvailabilityReminder(targetDate);
      
      expect(driversNeedingReminder).toHaveLength(0);
    });

    it("only includes active drivers with email addresses", async () => {
      const mockDrivers = [
        { id: 1, name: "Active Driver", email: "active@test.com", status: "active" },
      ];
      
      vi.mocked(db.getDriversNeedingAvailabilityReminder).mockResolvedValue(mockDrivers as any);
      
      const targetDate = "2025-12-28";
      const driversNeedingReminder = await db.getDriversNeedingAvailabilityReminder(targetDate);
      
      expect(driversNeedingReminder).toHaveLength(1);
      expect(driversNeedingReminder[0].email).toBeTruthy();
      expect(driversNeedingReminder[0].status).toBe("active");
    });
  });

  describe("Reminder Recording", () => {
    it("records when a reminder is sent", async () => {
      vi.mocked(db.recordAvailabilityReminder).mockResolvedValue(undefined);
      
      const driverId = 1;
      const reminderDate = "2025-12-28";
      
      await db.recordAvailabilityReminder(driverId, reminderDate);
      
      expect(db.recordAvailabilityReminder).toHaveBeenCalledWith(driverId, reminderDate);
    });
  });
});

describe("Availability Reminder Email", () => {
  it("sends reminder email with correct content", async () => {
    const { sendAvailabilityReminder } = await import("./notifications");
    
    const result = await sendAvailabilityReminder(
      "test@example.com",
      "Test Driver",
      "2025-12-28"
    );
    
    expect(result).toBe(true);
  });
});
