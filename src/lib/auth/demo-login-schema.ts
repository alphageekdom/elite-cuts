import { z } from 'zod';

import { DEMO_TYPES } from '@/models/User';

// Single source of truth for the shape posted to NextAuth's `demo` credentials
// provider. The provider's `authorize` function runs `safeParse` against this
// schema before any database work — matches the project's Zod convention
// (see `src/lib/promos/schema.ts` for the reference implementation).
export const demoLoginInputSchema = z.object({
  demoType: z.enum(DEMO_TYPES, { message: 'Invalid demo type' }),
});

export type DemoLoginInput = z.infer<typeof demoLoginInputSchema>;
