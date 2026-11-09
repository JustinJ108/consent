/**
 * Accounts created by `npm run demo:seed` / `npm run demo:reset`.
 * Keep these in sync with backend/src/db/seed.ts.
 *
 * These credentials are intentionally public: they only ever exist in the
 * local, fictional demo dataset. A production deployment should remove this
 * file (or gate it behind an env flag) along with the demo seed script.
 */

export const DEMO_PASSWORD = "demo1234";

export interface DemoAccount {
  org: string;
  email: string;
  blurb: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    org: "Riverside Shelter",
    email: "admin@riverside.test",
    blurb: "Owns most of the client records and grants consent.",
  },
  {
    org: "Harbor Clinic",
    email: "admin@harbor.test",
    blurb: "Sees only the health and housing categories shared with it.",
  },
  {
    org: "Northside Legal Aid",
    email: "admin@northside.test",
    blurb: "Receives limited legal access through client consent.",
  },
];
