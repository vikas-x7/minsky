import { z } from 'zod';

export const eventIdSchema = z.string().uuid();
