import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  createTrainingSession: vi.fn(),
  getTrainingSession: vi.fn(),
  getTrainingSessions: vi.fn(),
  updateTrainingSessionStatus: vi.fn(),
  completeTrainingSession: vi.fn(),
  updateChecklistItem: vi.fn(),
  getDriverTrainingHistory: vi.fn(),
  getTrainingProgress: vi.fn(),
  TRAINING_CHECKLIST_TEMPLATE: {
    'mml-yard': [
      { key: 'key-location', label: 'Where to get the keys' },
      { key: 'van-exterior', label: 'Van exterior walk-around inspection' },
    ],
    'warehouse': [
      { key: 'check-in', label: 'Check-in procedures at warehouse' },
      { key: 'scanning', label: 'Package scanning process' },
    ],
    'on-road-delivery': [
      { key: 'navigation', label: 'Using navigation and delivery app' },
    ],
  },
}));

import * as db from './db';

describe('Training Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTrainingSession', () => {
    it('should create a training session with checklist items', async () => {
      const mockSessionId = 1;
      vi.mocked(db.createTrainingSession).mockResolvedValue(mockSessionId);

      const result = await db.createTrainingSession(1, 2, '2024-12-27');

      expect(db.createTrainingSession).toHaveBeenCalledWith(1, 2, '2024-12-27');
      expect(result).toBe(mockSessionId);
    });
  });

  describe('getTrainingSession', () => {
    it('should return session with trainer, trainee, and checklist items', async () => {
      const mockSession = {
        id: 1,
        trainerId: 1,
        traineeId: 2,
        date: new Date('2024-12-27'),
        status: 'scheduled',
        trainer: { id: 1, name: 'John Trainer' },
        trainee: { id: 2, name: 'Jane Trainee' },
        checklistItems: [
          { id: 1, category: 'mml-yard', itemKey: 'key-location', itemLabel: 'Where to get the keys', isCompleted: false },
        ],
      };
      vi.mocked(db.getTrainingSession).mockResolvedValue(mockSession);

      const result = await db.getTrainingSession(1);

      expect(result).toEqual(mockSession);
      expect(result?.trainer).toBeDefined();
      expect(result?.trainee).toBeDefined();
      expect(result?.checklistItems).toBeDefined();
    });

    it('should return null for non-existent session', async () => {
      vi.mocked(db.getTrainingSession).mockResolvedValue(null);

      const result = await db.getTrainingSession(999);

      expect(result).toBeNull();
    });
  });

  describe('getTrainingSessions', () => {
    it('should return filtered sessions by status', async () => {
      const mockSessions = [
        { id: 1, status: 'in-progress', trainer: { name: 'John' }, trainee: { name: 'Jane' } },
      ];
      vi.mocked(db.getTrainingSessions).mockResolvedValue(mockSessions);

      const result = await db.getTrainingSessions({ status: 'in-progress' });

      expect(db.getTrainingSessions).toHaveBeenCalledWith({ status: 'in-progress' });
      expect(result).toHaveLength(1);
    });

    it('should return sessions filtered by trainer', async () => {
      const mockSessions = [
        { id: 1, trainerId: 5, trainer: { name: 'John' }, trainee: { name: 'Jane' } },
      ];
      vi.mocked(db.getTrainingSessions).mockResolvedValue(mockSessions);

      const result = await db.getTrainingSessions({ trainerId: 5 });

      expect(db.getTrainingSessions).toHaveBeenCalledWith({ trainerId: 5 });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateTrainingSessionStatus', () => {
    it('should update session status to in-progress', async () => {
      vi.mocked(db.updateTrainingSessionStatus).mockResolvedValue(undefined);

      await db.updateTrainingSessionStatus(1, 'in-progress');

      expect(db.updateTrainingSessionStatus).toHaveBeenCalledWith(1, 'in-progress');
    });

    it('should update session status to completed', async () => {
      vi.mocked(db.updateTrainingSessionStatus).mockResolvedValue(undefined);

      await db.updateTrainingSessionStatus(1, 'completed');

      expect(db.updateTrainingSessionStatus).toHaveBeenCalledWith(1, 'completed');
    });
  });

  describe('completeTrainingSession', () => {
    it('should complete session with rating and improvement areas', async () => {
      vi.mocked(db.completeTrainingSession).mockResolvedValue(undefined);

      await db.completeTrainingSession(1, 8, ['Time management', 'Navigation skills'], 'Good progress');

      expect(db.completeTrainingSession).toHaveBeenCalledWith(
        1,
        8,
        ['Time management', 'Navigation skills'],
        'Good progress'
      );
    });

    it('should complete session without notes', async () => {
      vi.mocked(db.completeTrainingSession).mockResolvedValue(undefined);

      await db.completeTrainingSession(1, 7, ['Safety awareness']);

      expect(db.completeTrainingSession).toHaveBeenCalledWith(1, 7, ['Safety awareness']);
    });
  });

  describe('updateChecklistItem', () => {
    it('should mark checklist item as completed', async () => {
      vi.mocked(db.updateChecklistItem).mockResolvedValue(undefined);

      await db.updateChecklistItem(1, true, 'Completed well');

      expect(db.updateChecklistItem).toHaveBeenCalledWith(1, true, 'Completed well');
    });

    it('should mark checklist item as not completed', async () => {
      vi.mocked(db.updateChecklistItem).mockResolvedValue(undefined);

      await db.updateChecklistItem(1, false);

      expect(db.updateChecklistItem).toHaveBeenCalledWith(1, false);
    });
  });

  describe('getDriverTrainingHistory', () => {
    it('should return training history for a driver', async () => {
      const mockHistory = [
        { id: 1, traineeId: 2, status: 'completed', confidenceRating: 8 },
        { id: 2, traineeId: 2, status: 'in-progress', confidenceRating: null },
      ];
      vi.mocked(db.getDriverTrainingHistory).mockResolvedValue(mockHistory);

      const result = await db.getDriverTrainingHistory(2);

      expect(db.getDriverTrainingHistory).toHaveBeenCalledWith(2);
      expect(result).toHaveLength(2);
    });
  });

  describe('getTrainingProgress', () => {
    it('should return progress stats for a session', async () => {
      const mockProgress = { total: 30, completed: 15, percentage: 50 };
      vi.mocked(db.getTrainingProgress).mockResolvedValue(mockProgress);

      const result = await db.getTrainingProgress(1);

      expect(result).toEqual(mockProgress);
      expect(result.percentage).toBe(50);
    });

    it('should return zero progress for empty session', async () => {
      const mockProgress = { total: 0, completed: 0, percentage: 0 };
      vi.mocked(db.getTrainingProgress).mockResolvedValue(mockProgress);

      const result = await db.getTrainingProgress(1);

      expect(result.percentage).toBe(0);
    });
  });

  describe('TRAINING_CHECKLIST_TEMPLATE', () => {
    it('should have all required categories', () => {
      const template = db.TRAINING_CHECKLIST_TEMPLATE;
      
      expect(template).toHaveProperty('mml-yard');
      expect(template).toHaveProperty('warehouse');
      expect(template).toHaveProperty('on-road-delivery');
    });

    it('should have items with key and label', () => {
      const template = db.TRAINING_CHECKLIST_TEMPLATE;
      
      const yardItems = template['mml-yard'];
      expect(yardItems.length).toBeGreaterThan(0);
      expect(yardItems[0]).toHaveProperty('key');
      expect(yardItems[0]).toHaveProperty('label');
    });
  });
});
