# PostgreSQL Migration Guide

This guide will help you migrate your kabini.ai application from SQLite3 to PostgreSQL.

## Overview

The migration involves:
- Replacing SQLite3 with PostgreSQL as the database engine
- Updating database connection and query syntax
- Installing new dependencies
- Setting up PostgreSQL environment

## Prerequisites

1. **PostgreSQL Installation**: Install PostgreSQL on your system
   - Windows: Download from https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql postgresql-contrib`

2. **Node.js**: Ensure you have Node.js 16+ installed

## Migration Steps

### 1. Install PostgreSQL Dependencies

Run one of these commands in your backend directory:

**Windows:**
```bash
setup-postgresql.bat
```

**PowerShell:**
```powershell
.\setup-postgresql.ps1
```

**Manual:**
```bash
npm install pg@^8.11.3
npm uninstall sqlite3
```

### 2. Set Up PostgreSQL Database

1. **Start PostgreSQL service**
2. **Create database:**
   ```sql
   CREATE DATABASE kabini_ai;
   ```
3. **Create user (optional):**
   ```sql
   CREATE USER kabini_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE kabini_ai TO kabini_user;
   ```

### 3. Configure Environment Variables

Copy `env.postgresql` to `.env` and update the values:

```bash
# PostgreSQL Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=kabini_ai
DB_PASSWORD=your_actual_password
DB_PORT=5432
DB_SSL=false
```

### 4. Initialize Database Tables

Run the database initialization script:

```bash
npm run init-db
```

This will create all necessary tables and indexes in PostgreSQL.

### 5. Test the Migration

Start your application:

```bash
npm start
```

Check the console for "Connected to PostgreSQL database" message.

## Key Changes Made

### Database Connection
- **Before**: SQLite3 file-based connection
- **After**: PostgreSQL connection pool with environment configuration

### Query Syntax
- **Before**: SQLite3 parameterized queries with `?`
- **After**: PostgreSQL parameterized queries with `$1`, `$2`, etc.

### Data Types
- **Before**: SQLite3 `DATETIME` and `BOOLEAN`
- **After**: PostgreSQL `TIMESTAMP` and `BOOLEAN`

### Auto-increment
- **Before**: SQLite3 `INTEGER PRIMARY KEY AUTOINCREMENT`
- **After**: PostgreSQL `SERIAL PRIMARY KEY`

## File Changes

### Modified Files
- `backend/database.js` - Complete rewrite for PostgreSQL
- `backend/init-database.js` - Updated for PostgreSQL
- `backend/package.json` - Replaced sqlite3 with pg

### New Files
- `backend/env.postgresql` - PostgreSQL configuration template
- `backend/setup-postgresql.bat` - Windows setup script
- `backend/setup-postgresql.ps1` - PowerShell setup script
- `POSTGRESQL_MIGRATION_GUIDE.md` - This guide

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure PostgreSQL service is running
   - Check host and port in environment variables

2. **Authentication Failed**
   - Verify username and password
   - Check if user has access to the database

3. **Database Not Found**
   - Create the database: `CREATE DATABASE kabini_ai;`
   - Check database name in environment variables

4. **Permission Denied**
   - Ensure user has proper privileges
   - Check PostgreSQL configuration files

### Debug Commands

```bash
# Check PostgreSQL status
pg_ctl status

# Connect to PostgreSQL
psql -U postgres -d kabini_ai

# List databases
\l

# List tables
\dt
```

## Performance Considerations

### Connection Pooling
- PostgreSQL connection pool is configured with max 20 connections
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

### Indexes
- All existing indexes are preserved
- PostgreSQL will automatically use appropriate indexes

### Transactions
- All database operations use proper transactions
- Rollback on errors ensures data consistency

## Rollback Plan

If you need to revert to SQLite3:

1. **Restore original files:**
   ```bash
   git checkout HEAD -- backend/database.js
   git checkout HEAD -- backend/init-database.js
   git checkout HEAD -- backend/package.json
   ```

2. **Reinstall SQLite3:**
   ```bash
   npm uninstall pg
   npm install sqlite3@^5.1.7
   ```

3. **Restore SQLite database file:**
   - Copy `sessions.db` back to backend directory

## Support

For PostgreSQL-specific issues:
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Node.js pg Documentation: https://node-postgres.com/

For application-specific issues:
- Check the application logs
- Review the database connection configuration
- Verify environment variables are set correctly

## Migration Checklist

- [ ] Install PostgreSQL
- [ ] Install pg dependency
- [ ] Remove sqlite3 dependency
- [ ] Create PostgreSQL database
- [ ] Configure environment variables
- [ ] Run database initialization
- [ ] Test application startup
- [ ] Verify all functionality works
- [ ] Remove old SQLite files
- [ ] Update deployment scripts if needed

## Benefits of PostgreSQL

1. **Scalability**: Better performance with large datasets
2. **Concurrency**: Superior handling of multiple connections
3. **ACID Compliance**: Stronger data integrity guarantees
4. **Advanced Features**: JSON support, full-text search, etc.
5. **Production Ready**: Industry-standard for production deployments
6. **Backup & Recovery**: Robust backup and recovery mechanisms
