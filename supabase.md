## Database Configuration ##
- Supabase Documentation: https://supabase.com/docs
## What are we doing?
- We will be replacing the local database with a supabase database so that we can deploy our application in Vercel.
- Moving from local to Supabase
- Moving local authentication with supabase authentication, this will allow user to create their account securely and safetely.
- Test the changes and make sure all the tables that were local are now in supabase. There is no need to migrate data inside the tables. We can start fresh to make things easier.
- Ensure the app is secure

## Supabase Database Information
POSTGRES_URL="postgres://<user>:<password>@<host>:6543/postgres?sslmode=require&supa=base-pooler.x"
POSTGRES_USER="postgres"
POSTGRES_HOST="db.<your-instance>.supabase.co"
SUPABASE_JWT_SECRET="<your-jwt-secret>"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
POSTGRES_PRISMA_URL="postgres://<user>:<password>@<host>:6543/postgres?sslmode=require&pgbouncer=true"
POSTGRES_PASSWORD="<your-db-password>"
POSTGRES_DATABASE="postgres"
SUPABASE_URL="https://<your-instance>.supabase.co"
SUPABASE_ANON_KEY="<your-anon-key>"
NEXT_PUBLIC_SUPABASE_URL="https://<your-instance>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
POSTGRES_URL_NON_POOLING="postgres://<user>:<password>@<host>:5432/postgres?sslmode=require"

