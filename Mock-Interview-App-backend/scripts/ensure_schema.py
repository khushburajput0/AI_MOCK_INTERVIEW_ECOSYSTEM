"""One-off script to ensure database schema columns/tables exist.

Run with the project's Python (virtualenv) so it uses the same DB settings.
Example: env/bin/python scripts/ensure_schema.py
"""
from app.core.database import get_engine

stmts = [
    # users.created_at
    "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",
    "UPDATE public.users SET created_at = NOW() WHERE created_at IS NULL;",
    # interviews score and completed_at
    "ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION;",
    "ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;",
    # future_interviews table
    "CREATE TABLE IF NOT EXISTS public.future_interviews (\n        id serial PRIMARY KEY,\n        user_id integer NOT NULL REFERENCES users(id),\n        scheduled_at timestamp DEFAULT now(),\n        title varchar\n    );",
]


def main():
    eng = get_engine()
    print("Connecting to database via engine: ", eng)
    with eng.connect() as conn:
        for s in stmts:
            print("Executing:", s)
            conn.exec_driver_sql(s)
    print("Schema ensure complete.")


if __name__ == '__main__':
    main()
