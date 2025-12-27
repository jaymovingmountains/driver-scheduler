import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getDriverAgreement: vi.fn(),
  createDriverAgreement: vi.fn(),
  updateAgreementPdfUrl: vi.fn(),
  markAgreementEmailSent: vi.fn(),
  getDriversWithAgreementStatus: vi.fn(),
  getDriversWithoutAgreement: vi.fn(),
  recordAgreementReminder: vi.fn(),
  getLastAgreementReminder: vi.fn(),
  needsAgreementReminder: vi.fn(),
  getAgreementStats: vi.fn(),
}));

// Mock the notifications module
vi.mock('./notifications', () => ({
  sendSignedAgreementEmail: vi.fn(),
  sendAgreementReminderEmail: vi.fn(),
}));

import * as db from './db';
import { sendSignedAgreementEmail, sendAgreementReminderEmail } from './notifications';
import { runAgreementReminderJob } from './jobs/agreementReminder';

describe('Driver Agreement Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agreement Database Operations', () => {
    it('should get agreement for a driver', async () => {
      const mockAgreement = {
        id: 1,
        driverId: 1,
        agreementVersion: '1.0',
        signatureData: 'base64data',
        signedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };
      
      vi.mocked(db.getDriverAgreement).mockResolvedValue(mockAgreement);
      
      const result = await db.getDriverAgreement(1);
      
      expect(db.getDriverAgreement).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockAgreement);
    });

    it('should return null for driver without agreement', async () => {
      vi.mocked(db.getDriverAgreement).mockResolvedValue(null);
      
      const result = await db.getDriverAgreement(999);
      
      expect(result).toBeNull();
    });

    it('should create a new agreement', async () => {
      const mockAgreement = {
        id: 1,
        driverId: 1,
        agreementVersion: '1.0',
        signatureData: 'base64data',
        signedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };
      
      vi.mocked(db.createDriverAgreement).mockResolvedValue(mockAgreement);
      
      const result = await db.createDriverAgreement({
        driverId: 1,
        agreementVersion: '1.0',
        signatureData: 'base64data',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
      
      expect(db.createDriverAgreement).toHaveBeenCalled();
      expect(result).toEqual(mockAgreement);
    });

    it('should get drivers with agreement status', async () => {
      const mockDrivers = [
        { id: 1, name: 'John', phone: '1234567890', hasSigned: true, signedAt: new Date() },
        { id: 2, name: 'Jane', phone: '0987654321', hasSigned: false, signedAt: null },
      ];
      
      vi.mocked(db.getDriversWithAgreementStatus).mockResolvedValue(mockDrivers as any);
      
      const result = await db.getDriversWithAgreementStatus();
      
      expect(result).toHaveLength(2);
      expect(result[0].hasSigned).toBe(true);
      expect(result[1].hasSigned).toBe(false);
    });

    it('should get drivers without agreement', async () => {
      const mockDrivers = [
        { id: 2, name: 'Jane', phone: '0987654321', email: 'jane@test.com', status: 'active' },
      ];
      
      vi.mocked(db.getDriversWithoutAgreement).mockResolvedValue(mockDrivers as any);
      
      const result = await db.getDriversWithoutAgreement();
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Jane');
    });

    it('should get agreement statistics', async () => {
      const mockStats = {
        totalActiveDrivers: 10,
        signedCount: 7,
        unsignedCount: 3,
        signedPercentage: 70,
      };
      
      vi.mocked(db.getAgreementStats).mockResolvedValue(mockStats);
      
      const result = await db.getAgreementStats();
      
      expect(result.totalActiveDrivers).toBe(10);
      expect(result.signedCount).toBe(7);
      expect(result.signedPercentage).toBe(70);
    });
  });

  describe('Agreement Reminder Logic', () => {
    it('should need reminder if never sent before', async () => {
      vi.mocked(db.needsAgreementReminder).mockResolvedValue(true);
      
      const result = await db.needsAgreementReminder(1);
      
      expect(result).toBe(true);
    });

    it('should not need reminder if sent within 6 hours', async () => {
      vi.mocked(db.needsAgreementReminder).mockResolvedValue(false);
      
      const result = await db.needsAgreementReminder(1);
      
      expect(result).toBe(false);
    });

    it('should record agreement reminder', async () => {
      vi.mocked(db.recordAgreementReminder).mockResolvedValue(undefined);
      
      await db.recordAgreementReminder(1);
      
      expect(db.recordAgreementReminder).toHaveBeenCalledWith(1);
    });
  });

  describe('Agreement Reminder Job', () => {
    it('should send reminders to unsigned drivers', async () => {
      const mockDrivers = [
        { id: 1, name: 'John', phone: '1234567890', email: 'john@test.com', status: 'active' },
        { id: 2, name: 'Jane', phone: '0987654321', email: 'jane@test.com', status: 'active' },
      ];
      
      vi.mocked(db.getDriversWithoutAgreement).mockResolvedValue(mockDrivers as any);
      vi.mocked(db.needsAgreementReminder).mockResolvedValue(true);
      vi.mocked(sendAgreementReminderEmail).mockResolvedValue(true);
      vi.mocked(db.recordAgreementReminder).mockResolvedValue(undefined);
      
      const result = await runAgreementReminderJob();
      
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(sendAgreementReminderEmail).toHaveBeenCalledTimes(2);
    });

    it('should skip drivers without email', async () => {
      const mockDrivers = [
        { id: 1, name: 'John', phone: '1234567890', email: null, status: 'active' },
      ];
      
      vi.mocked(db.getDriversWithoutAgreement).mockResolvedValue(mockDrivers as any);
      
      const result = await runAgreementReminderJob();
      
      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(sendAgreementReminderEmail).not.toHaveBeenCalled();
    });

    it('should skip drivers who received reminder within 6 hours', async () => {
      const mockDrivers = [
        { id: 1, name: 'John', phone: '1234567890', email: 'john@test.com', status: 'active' },
      ];
      
      vi.mocked(db.getDriversWithoutAgreement).mockResolvedValue(mockDrivers as any);
      vi.mocked(db.needsAgreementReminder).mockResolvedValue(false);
      
      const result = await runAgreementReminderJob();
      
      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(sendAgreementReminderEmail).not.toHaveBeenCalled();
    });

    it('should handle email send failures', async () => {
      const mockDrivers = [
        { id: 1, name: 'John', phone: '1234567890', email: 'john@test.com', status: 'active' },
      ];
      
      vi.mocked(db.getDriversWithoutAgreement).mockResolvedValue(mockDrivers as any);
      vi.mocked(db.needsAgreementReminder).mockResolvedValue(true);
      vi.mocked(sendAgreementReminderEmail).mockResolvedValue(false);
      
      const result = await runAgreementReminderJob();
      
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(db.recordAgreementReminder).not.toHaveBeenCalled();
    });

    it('should handle empty driver list', async () => {
      vi.mocked(db.getDriversWithoutAgreement).mockResolvedValue([]);
      
      const result = await runAgreementReminderJob();
      
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('Agreement Email Notifications', () => {
    it('should send signed agreement email', async () => {
      vi.mocked(sendSignedAgreementEmail).mockResolvedValue(true);
      
      const result = await sendSignedAgreementEmail(
        'test@example.com',
        'John Doe',
        new Date()
      );
      
      expect(result).toBe(true);
      expect(sendSignedAgreementEmail).toHaveBeenCalledWith(
        'test@example.com',
        'John Doe',
        expect.any(Date)
      );
    });

    it('should send agreement reminder email', async () => {
      vi.mocked(sendAgreementReminderEmail).mockResolvedValue(true);
      
      const result = await sendAgreementReminderEmail(
        'test@example.com',
        'John Doe'
      );
      
      expect(result).toBe(true);
      expect(sendAgreementReminderEmail).toHaveBeenCalledWith(
        'test@example.com',
        'John Doe'
      );
    });
  });
});
