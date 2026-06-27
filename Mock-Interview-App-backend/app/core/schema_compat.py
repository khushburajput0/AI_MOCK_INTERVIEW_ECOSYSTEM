from sqlalchemy import inspect


def ensure_schema_compat(engine) -> None:
    """Apply small schema fixes needed by merged model changes.

    Base.metadata.create_all() creates missing tables but does not add columns to
    existing tables. These guarded statements keep local/dev databases compatible
    without introducing a migration framework mid-project.
    """
    dialect = engine.dialect.name
    inspector = inspect(engine)

    if "users" in inspector.get_table_names():
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        with engine.begin() as conn:
            if "created_at" not in user_columns:
                if dialect == "postgresql":
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW()")
                    conn.exec_driver_sql("UPDATE users SET created_at = NOW() WHERE created_at IS NULL")
                    conn.exec_driver_sql("ALTER TABLE users ALTER COLUMN created_at SET NOT NULL")
                else:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN created_at DATETIME")

            if "is_email_verified" not in user_columns:
                if dialect == "postgresql":
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN")
                    conn.exec_driver_sql("UPDATE users SET is_email_verified = TRUE WHERE is_email_verified IS NULL")
                    conn.exec_driver_sql("ALTER TABLE users ALTER COLUMN is_email_verified SET DEFAULT FALSE")
                    conn.exec_driver_sql("ALTER TABLE users ALTER COLUMN is_email_verified SET NOT NULL")
                else:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 1 NOT NULL")

    table_names = set(inspector.get_table_names())
    if "email_verifications" not in table_names or "password_reset_tokens" not in table_names:
        # Model imports happen before this function is called, so create_all can
        # safely fill in newly merged tables.
        from app.core.database import Base

        Base.metadata.create_all(bind=engine)
