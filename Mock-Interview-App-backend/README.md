# Mock Interview App — Backend

Backend for the Mock Interview App built with FastAPI, SQLAlchemy and PostgreSQL.

This README explains how to install dependencies, configure environment variables, prepare the database, and run the application on macOS (zsh). Commands are copy/paste-ready for zsh.

## Prerequisites

- Python 3.11+ (recommended)
- PostgreSQL server
- Git

## Quick start (recommended)

1. Open a terminal at the project root.

2. Activate the included virtual environment (optional) or create a fresh one.

```zsh
# Use the provided virtualenv if you want to reuse it
source env/bin/activate

# OR create a fresh venv
python3 -m venv .venv
source .venv/bin/activate
```

3. Install dependencies:

```zsh
pip install --upgrade pip
pip install -r requirements.txt
```

## Environment variables

Create a `.env` file in the project root (next to `app/` and `requirements.txt`). Example `.env`:

```env
# App settings
SECRET_KEY=replace_with_a_long_random_secret_at_least_32_chars
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Database connection (preferred):
# postgres://<user>:<password>@<host>:<port>/<db_name>
# If the password contains special characters (like @), percent-encode them (for example @ -> %40).
DB_CONNECTION=postgresql+psycopg2://rishudb:Rishu%408279@localhost:5432/rishudb
```

Notes:
- Use a strong `SECRET_KEY` (32+ characters) to avoid JWT warnings and improve security.
- The app can also fall back to `DATABASE_URL` if `DB_CONNECTION` is not provided.

## Create the database and user (Postgres)

Example commands to create a database and user locally (run as a Postgres superuser):

```zsh
psql -U postgres -h localhost -p 5432

# inside psql:
CREATE USER rishudb WITH PASSWORD 'Rishu@8279';
CREATE DATABASE rishudb OWNER rishudb;
GRANT ALL PRIVILEGES ON DATABASE rishudb TO rishudb;
\q
```

If the password includes `@`, percent-encode it in the `DB_CONNECTION` URL like the example above.

If you see permission errors creating tables, ensure the DB user has permissions on the target schema (usually `public`):

```sql
GRANT ALL ON SCHEMA public TO rishudb;
```

## Run the application (development)

Start the FastAPI app with uvicorn (development reload enabled):

```zsh
uvicorn app.main:app --reload --port 8000
```

Interactive docs:

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Example API calls

Register a new user (JSON body):

```zsh
curl -X POST "http://127.0.0.1:8000/auth/register" \
	-H "Content-Type: application/json" \
	-d '{"full_name":"Rishu","email":"rishu@example.com","target_role":"backend","password":"SuperSecret123"}'
```

Login (returns JWT token):

```zsh
curl -X POST "http://127.0.0.1:8000/auth/login" \
	-H "Content-Type: application/json" \
	-d '{"email":"rishu@example.com","password":"SuperSecret123"}'
```

Use the returned `access_token` in the `Authorization: Bearer <token>` header for protected endpoints.

## CORS / UI integration notes

- If you call the API from a browser-based UI (for example `http://localhost:3000`), the browser will perform an OPTIONS preflight. The backend must allow that origin.
- In development the app may be configured to allow all origins. For production, whitelist only the UI origin(s) in CORS middleware.

## Troubleshooting

- DB connection errors:
	- Ensure Postgres is running and reachable at the host/port in `DB_CONNECTION`.
	- Verify credentials. If the password contains `@`, percent-encode it (e.g. `@` → `%40`).

- Tables not created on startup:
	- The app imports models and runs `Base.metadata.create_all()` at startup. If the DB user lacks create privileges, grant them on the schema or run migrations manually.
	- For evolving schemas, use Alembic migrations instead of relying on `create_all()`.

- Password hashing errors:
	- The project uses a hashing scheme compatible with pure-Python environments to avoid native build issues. For production, install `bcrypt` and configure passlib to use it for stronger hashing.

- JWT SECRET_KEY warnings:
	- Increase `SECRET_KEY` to at least 32 random characters to avoid insecure key warnings.

## Recommended next steps

- Add Alembic for schema migrations and remove runtime `create_all()` when you adopt migrations.
- Use a secrets manager for `SECRET_KEY` and DB credentials in production.
- Add tests and CI to validate changes before deploying.

## Need me to update CORS?

Tell me your UI origin (for example `http://localhost:3000`) and I can update `app/main.py` to whitelist it to stop preflight 405s while keeping CORS restricted for production.

---
Thank you — happy hacking!
uvicorn app.main:app --reload --port 8000