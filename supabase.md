## Database Configuration ##
- Supabase Documentation: https://supabase.com/docs
## What are we doing?
- We will be replacing the local database with a supabase database so that we can deploy our application in Vercel.
- Moving from local to Supabase
- Moving local authentication with supabase authentication, this will allow user to create their account securely and safetely.
- Test the changes and make sure all the tables that were local are now in supabase. There is no need to migrate data inside the tables. We can start fresh to make things easier.
- Ensure the app is secure

## Supabase Database Information
POSTGRES_URL="postgres://postgres.buvzbxinbrfrfssvyagk:nHExun3FX3YbBQAT@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
POSTGRES_USER="postgres"
POSTGRES_HOST="db.buvzbxinbrfrfssvyagk.supabase.co"
SUPABASE_JWT_SECRET="cIVmAPkl36aHvmrUCP06D6eD7eKLnfqX4ZXoLaDn7xAu8ZQUquBdti/ObUEMvhR1H6UF0IwLGi/4yNtwDqi22g=="
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dnpieGluYnJmcmZzc3Z5YWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDQ4MzQsImV4cCI6MjA2ODE4MDgzNH0.3Tj-Y-EcCly8Yf2VPvEMM_NWDT6dxQuvga5vW_EATco"
POSTGRES_PRISMA_URL="postgres://postgres.buvzbxinbrfrfssvyagk:nHExun3FX3YbBQAT@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
POSTGRES_PASSWORD="nHExun3FX3YbBQAT"
POSTGRES_DATABASE="postgres"
SUPABASE_URL="https://buvzbxinbrfrfssvyagk.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dnpieGluYnJmcmZzc3Z5YWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDQ4MzQsImV4cCI6MjA2ODE4MDgzNH0.3Tj-Y-EcCly8Yf2VPvEMM_NWDT6dxQuvga5vW_EATco"
NEXT_PUBLIC_SUPABASE_URL="https://buvzbxinbrfrfssvyagk.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dnpieGluYnJmcmZzc3Z5YWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNDgzNCwiZXhwIjoyMDY4MTgwODM0fQ.ydGAAMXkDEeG2nUIwtNUJ0IbwYwceX2SIHYO_7TWWys"
POSTGRES_URL_NON_POOLING="postgres://postgres.buvzbxinbrfrfssvyagk:nHExun3FX3YbBQAT@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

