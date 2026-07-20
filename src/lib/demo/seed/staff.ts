import type { StaffMember } from '@/models/StaffMember';

// Seed shape: just the authored fields; timestamps are stamped by Mongoose
// at insert time.
export type DemoStaffSeed = Omit<StaffMember, 'createdAt' | 'updatedAt'>;

// Six staff members — same roster as scripts/seed.mjs and the Our Story
// team page. Colors are the canonical ShiftColor values from
// `src/lib/shift-constants.ts`. Maya is seasonal so a real admin can
// observe the seasonal filter pill behavior on the Staff tab.
export const DEMO_STAFF: DemoStaffSeed[] = [
  {
    name: 'Tomás Reyes',
    role: 'Head butcher',
    roleKey: 'head-butcher',
    station: 'Butcher Station',
    color: 'tangelo',
    status: 'active',
    email: 'tomas@elitecuts.demo',
    notes: 'Founder & head butcher. Opens most weekdays.',
  },
  {
    name: 'Marcus Vega',
    role: 'Charcuterie',
    roleKey: 'charcuterie',
    station: 'Prep Station',
    color: 'marcus',
    status: 'active',
    email: 'marcus@elitecuts.demo',
    notes: 'Senior butcher running the charcuterie program.',
  },
  {
    name: 'Elena Huang',
    role: 'Receiving',
    roleKey: 'receiving',
    station: 'Stockroom',
    color: 'elena',
    status: 'active',
    email: 'elena@elitecuts.demo',
    notes: 'Sourcing & operations. On the road most weeks visiting farms.',
  },
  {
    name: 'Sam Okafor',
    role: 'Counter',
    roleKey: 'counter',
    station: 'Front Counter',
    color: 'sam',
    status: 'active',
    email: 'sam@elitecuts.demo',
    notes: 'Counter & customer care. Weekend lead.',
  },
  {
    name: 'Maya Park',
    role: 'Apprentice',
    roleKey: 'apprentice',
    station: 'Butcher Station',
    color: 'maya',
    status: 'seasonal',
    email: 'maya@elitecuts.demo',
    notes: 'Apprentice butcher in her second year. Summer cohort.',
  },
  {
    name: 'Carlos Mendez',
    role: 'Delivery',
    roleKey: 'delivery',
    station: 'Delivery',
    color: 'delivery',
    status: 'active',
    email: 'carlos@elitecuts.demo',
    notes: 'Morning deliveries Tue/Thu/Sat.',
  },
];
