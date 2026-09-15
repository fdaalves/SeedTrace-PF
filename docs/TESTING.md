# Testing Strategy

SeedTrace PF uses automated tests in the backend CI to protect domain rules and access control.

## Layers

1. Pure validation tests
   - codes and text normalization;
   - numeric limits;
   - descriptor types and controlled options;
   - varietal value compatibility.

2. Endpoint contract tests
   - protected domain endpoints reject incomplete payloads with HTTP 400;
   - malformed codes are rejected before persistence;
   - invalid quantities are rejected before database access.

3. Authorization tests
   - unauthenticated API requests return HTTP 401;
   - Admin, Manager and Technician can pass the global write gate;
   - Field Operator and Viewer are blocked from write endpoints with HTTP 403;
   - Technician cannot read the audit trail;
   - Manager cannot administer users;
   - every authenticated role can read its own profile.

## Testability

`buildApp()` accepts an optional authentication function. Production continues to use Supabase authentication by default, while tests inject deterministic user profiles. This keeps authorization tests fast and independent from external services.

## CI

The Backend CI executes tests, TypeScript typecheck and build on pushes. A failed authorization or endpoint contract test blocks the workflow from completing successfully.
