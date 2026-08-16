# Architecture

## Boundaries

- `backend/` contains the Django API, asynchronous tasks, WebSocket endpoints, and domain apps.
- `frontend/` contains the Vite-powered React application.
- `compose.yaml` provides the local integration environment; production orchestration is intentionally separate.

## Runtime topology

The browser calls Django's HTTP API and connects to WebSocket endpoints through ASGI. Django uses PostgreSQL for transactional data, Redis for Channels and Celery results, and RabbitMQ as the Celery broker. SMS.ir credentials are supplied only through deployment secrets and are consumed by the future OTP app.

## Planned backend app ownership

- `accounts`: custom user model, OTP authentication, SMS.ir adapter, and session/token management.
- `catalog`: products, categories, inventory, pricing, and media metadata.
- `orders`: carts, checkout, orders, payments, and fulfillment.
- `chat`: conversations, messages, authorization, and Channels consumers.
- `core`: shared domain primitives, error handling, and platform utilities.

## Security baselines

- Secrets are injected through environment variables and never committed.
- OTP verification must apply per-phone and per-IP rate limits, short expiry, single-use codes, and audit events.
- WebSocket consumers must authenticate and authorize the conversation before joining groups.
