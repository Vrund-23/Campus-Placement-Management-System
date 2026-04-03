/**
 * Centralized list of all college departments.
 * These must match the departments table in the database.
 *
 * Codes:  Computer(CP)  IT(IT)  Electronics(EL)  Mechanical(ME)
 *         Civil(CE)  Production(PR)  Electrical(EE)  EC(EC)
 */
export const DEPARTMENTS = [
    'Computer',
    'IT',
    'Electronics',
    'Mechanical',
    'Civil',
    'Production',
    'Electrical',
    'EC',
] as const;

export type Department = (typeof DEPARTMENTS)[number];
