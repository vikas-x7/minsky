import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

describe('SeedController', () => {
  let controller: SeedController;
  let mockSeedService: any;

  beforeEach(() => {
    mockSeedService = {
      seed: vi.fn(),
    };
    controller = new SeedController(mockSeedService);
  });

  describe('POST /seed', () => {
    it('seeds the database and returns success', async () => {
      const mockResult = { count: 6 };
      mockSeedService.seed.mockResolvedValue(mockResult);

      const result = await controller.seed();

      expect(result).toEqual({
        success: true,
        data: mockResult,
      });
    });

    it('calls seedService.seed', async () => {
      mockSeedService.seed.mockResolvedValue({ count: 6 });
      await controller.seed();
      expect(mockSeedService.seed).toHaveBeenCalledOnce();
    });
  });
});
