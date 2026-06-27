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

macOS / Linux (zsh / bash):

```zsh
# Use the provided virtualenv if you want to reuse it
source env/bin/activate

# OR create a fresh venv
python3 -m venv .venv
source .venv/bin/activate
```

Windows (PowerShell):

```powershell
# Use the provided virtualenv if you want to reuse it
env\Scripts\Activate.ps1

# OR create a fresh venv
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Windows (Command Prompt):

```cmd
REM Use the provided virtualenv if you want to reuse it
env\Scripts\activate.bat

REM OR create a fresh venv
python -m venv .venv
.venv\Scripts\activate.bat
```

3. Install dependencies:

macOS / Linux (zsh / bash):

```zsh
pip install --upgrade pip
pip install -r requirements.txt
```

Windows (PowerShell / Command Prompt):

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
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

# Gemini API
# Prefer GOOGLE_API_KEY or GEMINI_API_KEY from Google AI Studio.
# GOOGLE_API_KEY takes precedence when both are set.
GEMINI_API_KEY=replace_with_your_gemini_api_key
GEMINI_MODEL=gemini-flash-latest
```

Example (Neon Postgres, enforce SSL):

```env
# Neon connection string (example)
DB_CONNECTION=postgresql://neondb_owner:npg_4m2zAKdkPBlO@ep-wandering-firefly-ad6ciuky-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

Notes:
- Use a strong `SECRET_KEY` (32+ characters) to avoid JWT warnings and improve security.
- The app can also fall back to `DATABASE_URL` if `DB_CONNECTION` is not provided.
- Keep Gemini keys server-side only. If a key is exposed, create a new key in Google AI Studio, update `.env`, and revoke the old key.
- If Gemini returns quota errors, check the key's Google Cloud project billing/quota in AI Studio. The app will reuse existing generated questions and temporarily fall back to local questions instead of repeatedly calling an exhausted quota.

## Create the database and user (Postgres)

Example commands to create a database and user locally (run as a Postgres superuser):

macOS / Linux:

```zsh
psql -U postgres -h localhost -p 5432

# inside psql:
CREATE USER rishudb WITH PASSWORD 'Rishu@8279';
CREATE DATABASE rishudb OWNER rishudb;
GRANT ALL PRIVILEGES ON DATABASE rishudb TO rishudb;
\q
```

Windows (PowerShell / Command Prompt):

```powershell
# If psql is on your PATH (Postgres installer usually adds it), run:
psql -U postgres -h localhost -p 5432

# inside psql (same SQL commands):
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

macOS / Linux:

```zsh
uvicorn app.main:app --reload --port 8000
```

Windows (PowerShell / Command Prompt):

```powershell
# If uvicorn is available on PATH:
uvicorn app.main:app --reload --port 8000

# Or use the python -m invocation to avoid PATH issues:
python -m uvicorn app.main:app --reload --port 8000
```

Interactive docs:

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Example API calls

Register a new user (JSON body):

macOS / Linux (curl):

```zsh
curl -X POST "http://127.0.0.1:8000/auth/register" \
	-H "Content-Type: application/json" \
	-d '{"full_name":"Rishu","email":"rishu@example.com","target_role":"backend","password":"SuperSecret123"}'
```

Windows (PowerShell - Invoke-RestMethod):

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/register" -Method Post -ContentType "application/json" -Body '{"full_name":"Rishu","email":"rishu@example.com","target_role":"backend","password":"SuperSecret123"}'
```

Login (returns JWT token):

macOS / Linux (curl):

```zsh
curl -X POST "http://127.0.0.1:8000/auth/login" \
	-H "Content-Type: application/json" \
	-d '{"email":"rishu@example.com","password":"SuperSecret123"}'
```

Windows (PowerShell - Invoke-RestMethod):

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"rishu@example.com","password":"SuperSecret123"}'
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
