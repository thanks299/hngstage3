#!/bin/bash

echo "🟢 Fixing PostgreSQL permissions..."

# Connect and setup
sudo -u postgres psql <<EOF
-- Drop existing user if problems
DROP USER IF EXISTS insighta_user;

-- Create fresh user
CREATE USER insighta_user WITH PASSWORD 'test123';

-- Grant permissions
ALTER USER insighta_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE insighta_labs TO insighta_user;
GRANT ALL ON SCHEMA public TO insighta_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO insighta_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO insighta_user;

-- Also grant to postgres for safety
GRANT ALL PRIVILEGES ON DATABASE insighta_labs TO postgres;
GRANT ALL ON SCHEMA public TO postgres;

\q
EOF

echo "✅ PostgreSQL user configured"
echo "📝 Update your .env file with:"
echo "   DB_USER=insighta_user"
echo "   DB_PASSWORD=test123"