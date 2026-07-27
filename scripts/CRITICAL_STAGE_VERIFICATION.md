# Critical stage verification

This file triggers the MedStart CI workflow against the current `main` baseline without changing application behavior.

Verification scope:
- dependency installation with frozen lockfile;
- Firebase/Storage critical rules tests in emulators;
- TypeScript typecheck;
- production build;
- critical security invariants for bookings, conversations, medical workspace data and direct medical uploads.
