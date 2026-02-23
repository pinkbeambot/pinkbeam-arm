#!/bin/bash
# Database backup script
# Creates a manual backup of the Supabase database

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
PROJECT_REF="${SUPABASE_PROJECT_REF:-$1}"

if [ -z "$PROJECT_REF" ]; then
    echo "Usage: $0 <project-ref>"
    echo "Or set SUPABASE_PROJECT_REF environment variable"
    exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "📦 Creating database backup..."
echo "Project: $PROJECT_REF"
echo "Timestamp: $TIMESTAMP"

# Full database dump (schema + data)
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI..."
    supabase db dump -f "$BACKUP_DIR/backup_$TIMESTAMP.sql"
else
    echo "Supabase CLI not found. Using pg_dump..."
    if [ -z "$SUPABASE_DB_PASSWORD" ]; then
        echo "❌ SUPABASE_DB_PASSWORD not set"
        exit 1
    fi
    
    PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
        -h "db.$PROJECT_REF.supabase.co" \
        -p 5432 \
        -U postgres \
        -d postgres \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        -f "$BACKUP_DIR/backup_$TIMESTAMP.sql"
fi

# Compress backup
gzip -f "$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo "✅ Backup created: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Optional: Upload to S3
if [ -n "$S3_BACKUP_BUCKET" ]; then
    echo "📤 Uploading to S3..."
    aws s3 cp "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz" "s3://$S3_BACKUP_BUCKET/" || {
        echo "⚠️  S3 upload failed (ignoring)"
    }
fi

# Cleanup old backups (keep last 30)
echo "🧹 Cleaning up old backups..."
ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm || true

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | wc -l)
echo "📊 Total backups: $BACKUP_COUNT"

echo ""
echo "🎉 Backup complete!"
