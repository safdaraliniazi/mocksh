# Supabase Database Setup

## Apply Migrations

To set up the database tables, you need to apply the migrations to your Supabase project.

### Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

3. Push migrations:
```bash
supabase db push
```

### Option 2: Using Supabase Dashboard (Manual)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migrations in order:

**First Migration (Profiles):**
```sql
-- Copy content from supabase/migrations/20260210000000_create_profiles.sql
```

**Second Migration (Test Results):**
```sql
-- Copy content from supabase/migrations/20260210000001_create_test_results.sql
```

## Database Schema

### Tables Created

#### `profiles`
- User profile information
- Linked to auth.users

#### `test_results`
- Stores all test attempt data
- Includes:
  - Score and percentage
  - Time taken
  - User answers (JSON)
  - Questions attempted (JSON)

### Views Created

#### `leaderboard`
- Public view showing rankings
- Sorted by score and time
- Includes user email

#### `user_stats`
- Aggregate statistics per user
- Total tests taken
- Average/best/worst percentages
- Total questions attempted

## Row Level Security (RLS)

All tables have RLS enabled:
- Users can only view/insert their own data
- Leaderboard is viewable by all authenticated users

## Testing the Setup

After applying migrations, test with:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- View leaderboard structure
SELECT * FROM leaderboard LIMIT 5;

-- View user stats structure  
SELECT * FROM user_stats LIMIT 5;
```
