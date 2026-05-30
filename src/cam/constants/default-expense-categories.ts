/**
 * Story 4 — 15 system-default expense categories.
 *
 * Seeded once per organization on first access; users can add custom
 * categories (Story 5) which live alongside these in the same collection
 * with `is_system: false` and `portfolio_id` scoped.
 *
 * The names must match what the bill OCR pipeline normalizes to and what
 * the UX `EXPENSE_CATS` constant uses, so don't rename them without
 * coordinating both ends.
 */
export interface DefaultExpenseCategory {
  name: string;
  description: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultExpenseCategory[] = [
  {
    name: 'Electricity',
    description:
      'Electricity costs for lighting and powering common areas (hallways, lobbies, parking lots).',
  },
  {
    name: 'Water & Sewer',
    description:
      'Water supply and sewage services for shared facilities and landscaping irrigation.',
  },
  {
    name: 'Trash & Recycling',
    description: 'Waste management, dumpster pickup, and recycling services.',
  },
  {
    name: 'Landscaping & Grounds',
    description:
      'Mowing, tree pruning, planting, and general upkeep of exterior grounds.',
  },
  {
    name: 'Snow & Ice Removal',
    description: 'Plowing, salting, and shoveling of parking lots and walkways.',
  },
  {
    name: 'Parking Lot Maintenance',
    description: 'Asphalt repair, striping, power washing, and sweeping.',
  },
  {
    name: 'HVAC Maintenance',
    description:
      'Routine servicing and repair of common area heating, ventilation, and cooling systems.',
  },
  {
    name: 'Elevator Maintenance',
    description:
      'Routine inspections, servicing, and repairs for building elevators.',
  },
  {
    name: 'General Repairs',
    description:
      'Minor day-to-day repairs and upkeep of shared building areas (e.g., painting, light bulb replacement).',
  },
  {
    name: 'Janitorial & Cleaning',
    description:
      'Cleaning of lobbies, shared restrooms, hallways, and windows.',
  },
  {
    name: 'Security Services',
    description:
      'On-site guard services, mobile patrols, and alarm/camera system monitoring.',
  },
  {
    name: 'Pest Control',
    description: 'Routine inspections and extermination services for the property.',
  },
  {
    name: 'Property Insurance',
    description:
      'General liability and property hazard insurance premiums for the building.',
  },
  {
    name: 'Property Taxes',
    description:
      'Municipal, county, or state property taxes assessed on the property.',
  },
  {
    name: 'Management Fees',
    description:
      'Fees paid for the professional management and administration of the property.',
  },
];

export const DEFAULT_EXPENSE_CATEGORY_NAMES: readonly string[] =
  DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name);
