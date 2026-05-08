import { z } from 'zod';

const postgresUuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const eventIdSchema = z.string().regex(postgresUuidRegex);
