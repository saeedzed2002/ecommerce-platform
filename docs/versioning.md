# Versioning Policy

## Project releases

This project uses Semantic Versioning: `MAJOR.MINOR.PATCH`.

- `MAJOR`: backward-incompatible product or platform changes.
- `MINOR`: backward-compatible features.
- `PATCH`: backward-compatible fixes and maintenance.

The current development version is `0.1.0`. The project remains below `1.0.0` until the core storefront flow is complete: catalog, product detail, cart, checkout, and authentication.

Release tags are created only from `main`, after CI succeeds. Examples: `v0.1.0`, `v0.2.0`, and `v1.0.0`.

## API versions

Public HTTP APIs are versioned independently in their URL.

- The first stable API is `/api/v1/`.
- Additive, backward-compatible changes remain in `v1`.
- Breaking request or response changes require a new API version, such as `/api/v2/`.
- The previous API version remains available during a documented deprecation period.

## Change discipline

Every release version must have a concise changelog entry and a Git tag. Feature branches do not receive release tags.
