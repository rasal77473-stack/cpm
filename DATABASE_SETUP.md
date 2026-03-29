# Database Configuration Guide

## Local Development (SQLite)
The app automatically uses SQLite when no DATABASE_URL is set. The database file `cpm.db` is created locally.

```bash
pnpm dev
```

## Production on Render (Turso)

### 1. Create a Free Turso Database

1. Sign up at [turso.tech](https://turso.tech)
2. Create a new database (free tier available)
3. Copy your database URL and auth token

### 2. Set Environment Variables on Render

In your Render service settings, add these environment variables:

```
DATABASE_URL=libsql://your-db-name-org.turso.io
DATABASE_AUTH_TOKEN=your_auth_token_here
```

### 3. Deploy

Push to main and Render will automatically deploy with the database connection.

## Alternative: Use PostgreSQL

To use PostgreSQL instead:

1. Set up a PostgreSQL database (e.g., Supabase)
2. Update `drizzle.config.ts` to use PostgreSQL dialect
3. Update `db/index.ts` to use the PostgreSQL driver
4. Set `DATABASE_URL` environment variable on Render

## Testing

After deployment, the app will automatically connect to:
- Local SQLite (dev environment)
- Turso/libsql if DATABASE_URL is set (production)
- PostgreSQL if you switch back to it

No code changes needed - just environment variables!
