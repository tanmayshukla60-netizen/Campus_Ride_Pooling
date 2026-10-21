#!/usr/bin/env bash
# reset_demo.sh
# Drops and recreates campus_rides database, reapplies all migrations, and re-seeds.
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "============================================================"
echo "  Campus Ride-Pooling System - Resetting Demo Database"
echo "============================================================"

DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="campus_rides"

echo "[1/4] Terminating existing connections and recreating database '$DB_NAME'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid != pg_backend_pid();
"
dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME"
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

echo "[2/4] Applying Migration 001_init_schema.sql (Schema, Constraints, Indexes)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f db/migrations/001_init_schema.sql

echo "[3/4] Applying Migration 002_triggers_and_audit.sql (Triggers, State Machine)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f db/migrations/002_triggers_and_audit.sql

echo "[4/4] Applying Migration 003_functions_and_views.sql (Stored Functions, Views)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f db/migrations/003_functions_and_views.sql

echo "[*] Loading fresh seed data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f db/seed.sql

echo "============================================================"
echo "  DATABASE RESET COMPLETE! Pristine demo state ready."
echo "============================================================"
