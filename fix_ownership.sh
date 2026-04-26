#!/bin/bash

echo "🟢 Fixing database ownership..."

sudo -u postgres psql -d insighta_labs <<EOF
-- Change ownership of all tables
ALTER TABLE IF EXISTS profiles OWNER TO insighta_user;
ALTER TABLE IF EXISTS users OWNER TO insighta_user;
ALTER TABLE IF EXISTS refresh_tokens OWNER TO insighta_user;

-- Change schema ownership
ALTER SCHEMA public OWNER TO insighta_user;

-- Grant all privileges
GRANT ALL ON SCHEMA public TO insighta_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO insighta_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO insighta_user;

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE insighta_labs TO insighta_user;

\q
EOF

echo "✅ Ownership fixed!"
echo "🔄 Restarting server..."
npm run dev