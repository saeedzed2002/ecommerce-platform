# Ecommerce Platform

Production-oriented e-commerce platform with Django, React, PostgreSQL, Redis, RabbitMQ, Celery, OTP authentication, and real-time WebSocket chat.

## Architecture

This repository is a monorepo:

- `backend/`: Django 5.2.9, Django REST Framework, Channels, Celery, and domain apps.
- `frontend/`: React, TypeScript, and Vite.
- `compose.yaml`: local integration stack for PostgreSQL, Redis, RabbitMQ, Django, Celery, and React.
- `docs/`: architecture and development documentation.

See [architecture.md](docs/architecture.md) for service boundaries and planned app ownership.

## Local development

1. Copy `.env.example` to `.env` and replace placeholder secrets.
2. Run `docker compose up --build`.
3. Run `docker compose exec backend python manage.py migrate`.

The API health endpoint is available at `http://localhost:8000/health/`.

## Project status

The repository has the executable platform skeleton. The next implementation milestone is the `accounts` app: custom user model, SMS.ir OTP flow, rate limiting, and tests.
