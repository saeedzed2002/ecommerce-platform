# Development guide

## Prerequisites

- Docker Desktop with Docker Compose v2
- Python 3.13 and Node.js 24 only when running services outside Docker

## First run

1. Copy `.env.example` to `.env` and replace every placeholder secret.
2. Start the stack with `docker compose up --build`.
3. Run database migrations with `docker compose exec backend python manage.py migrate`.
4. Open the frontend at `http://localhost:5173`, API health at `http://localhost:8000/health/`, and RabbitMQ management at `http://localhost:15672`.

## Quality checks

Run `docker compose run --rm backend ruff check .` and `docker compose run --rm backend python manage.py check` before opening a pull request.

## Environment variables

`SMSIR_API_KEY` and `SMSIR_LINE_NUMBER` are reserved for the OTP adapter. Use a separate SMS.ir sandbox or test credential for local work; never place production credentials in `.env.example`, commits, issue comments, or CI logs.
