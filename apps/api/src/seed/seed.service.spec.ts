import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeedService } from './seed.service';

describe('SeedService', () => {
  let seedService: SeedService;
  let mockDb: any;

  function createMockDb() {
    return {
      insert: vi.fn(),
      delete: vi.fn(),
      select: vi.fn(),
    };
  }

  beforeEach(() => {
    mockDb = createMockDb();
    const mockDatabaseService = { db: mockDb };
    seedService = new SeedService(mockDatabaseService as any);
  });

  describe('seed', () => {
    it('inserts sample events into the database', async () => {
      mockDb.delete.mockReturnValue({});
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{}, {}, {}, {}, {}, {}]),
      });

      const result = await seedService.seed();

      expect(result.eventsCreated).toBe(6);
      expect(result.message).toContain('6');
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it('clears existing data before seeding', async () => {
      mockDb.delete.mockReturnValue({});
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{}]),
      });

      await seedService.seed();

      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });

    it('returns count of 0 when no events inserted', async () => {
      mockDb.delete.mockReturnValue({});
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      });

      const result = await seedService.seed();

      expect(result.eventsCreated).toBe(0);
    });
  });
});
