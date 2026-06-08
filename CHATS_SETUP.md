# Chat History Setup Guide

This guide will help you set up the persistent chat history feature using Supabase.

## Prerequisites

- A Supabase account (free tier is fine)
- Your Firebase authentication already configured

## Setup Steps

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details and create

### 2. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase_schema.sql` from this repo
3. Paste into the SQL editor and click **Run**
4. Verify tables are created by checking **Table Editor** → you should see `conversation` and `message` tables

### 3. Get Your Supabase Credentials

1. In Supabase dashboard, go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### 4. Configure Environment Variables

1. Open `frontend/.env`
2. Add these lines at the bottom:

```env
# Supabase (for chat history storage)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace with your actual credentials from step 3
4. **Restart your dev server** (`npm run dev` in `frontend/`)

### 5. Test It Out

1. Open your app
2. Click the AI chat button (floating button in bottom-right)
3. Send a message
4. Navigate to the **Chats** tab in the sidebar
5. You should see your conversation listed!

## Features

### Floating Chat (Bottom-Right Button)
- Opens a drawer from the right side
- Full chat with AI assistant
- Automatically saves all messages to Supabase
- **"Open in Chats" button** (expand icon in header) - opens the full Chats page
- **"New Chat" button** (refresh icon) - starts a fresh conversation

### Chats Page (Sidebar → Chats)
- Left panel: List of all your conversations with timestamps
- Right panel: Full message thread for selected conversation
- Real-time updates - messages appear instantly
- Delete conversations
- Create new chats
- Persistent across page refreshes and browser sessions

### How They Connect
- Both the floating chat and the Chats page save to the same Supabase database
- Click "Open in Chats" in the floating chat to view that conversation in the full Chats page
- All conversations appear in both interfaces seamlessly

## Troubleshooting

### "No chats yet" even after sending messages

**Check:**
1. Did you add the Supabase credentials to `frontend/.env`?
2. Did you restart the dev server after adding credentials?
3. Open browser console (F12) - any errors?
4. In Supabase dashboard → Table Editor → `conversation` - do you see rows?

**Common fix:** The `user_id` field in the `conversation` table stores the Firebase UID. Make sure you're logged in with Firebase.

### Tables not appearing in Supabase

- Make sure you ran the entire `supabase_schema.sql` script
- Check for SQL errors in the Supabase SQL Editor output panel

### Messages not showing in real-time

- Verify realtime is enabled: Supabase Dashboard → Database → Replication
- Make sure `conversation` and `message` tables are published
- Check browser console for subscription errors

### RLS (Row Level Security) errors

The current RLS policies allow all operations. In production, you should:
1. Integrate Supabase with Firebase JWT tokens, OR
2. Update RLS policies to check `auth.uid()` matches `user_id`

For development, you can temporarily disable RLS:
```sql
ALTER TABLE conversation DISABLE ROW LEVEL SECURITY;
ALTER TABLE message DISABLE ROW LEVEL SECURITY;
```

## Architecture

```
FloatingAiChat.jsx
  ↓ saves messages to →  Supabase (conversation + message tables)
  ↓ "Open in Chats" →    ChatsPage.jsx
                           ↑ loads messages from → Supabase
```

Both components:
- Create a `conversation` row when starting a new chat
- Insert `message` rows for each user/assistant turn
- Subscribe to real-time updates
- Store `conversation_id` in localStorage to maintain state

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Check browser console for detailed error messages
- Verify environment variables are loaded: `console.log(import.meta.env.VITE_SUPABASE_URL)`
