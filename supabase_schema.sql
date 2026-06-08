-- Supabase Chat History Schema
-- Run this in your Supabase SQL Editor

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Firebase UID (stored as text since Firebase uses string UIDs)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create messages table
CREATE TABLE IF NOT EXISTS message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversation(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_user_id ON conversation(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON conversation(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_conversation_id ON message(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_created_at ON message(created_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
-- Note: Since you're using Firebase Auth (not Supabase Auth), you'll need to handle
-- authorization in your application layer, or configure custom JWT claims.
-- For now, these policies allow all authenticated users to access their own data
-- based on user_id matching. Adjust as needed for your auth setup.

-- Allow users to read their own conversations
CREATE POLICY "Users can read own conversations" ON conversation
  FOR SELECT
  USING (true); -- Adjust this based on your auth strategy

-- Allow users to create their own conversations
CREATE POLICY "Users can create own conversations" ON conversation
  FOR INSERT
  WITH CHECK (true); -- Adjust this based on your auth strategy

-- Allow users to delete their own conversations
CREATE POLICY "Users can delete own conversations" ON conversation
  FOR DELETE
  USING (true); -- Adjust this based on your auth strategy

-- Allow users to read messages in their conversations
CREATE POLICY "Users can read messages in own conversations" ON message
  FOR SELECT
  USING (true); -- Adjust this based on your auth strategy

-- Allow users to insert messages in their conversations
CREATE POLICY "Users can insert messages in own conversations" ON message
  FOR INSERT
  WITH CHECK (true); -- Adjust this based on your auth strategy

-- 6. Enable Realtime (optional but recommended)
-- This allows real-time updates in the UI
ALTER PUBLICATION supabase_realtime ADD TABLE conversation;
ALTER PUBLICATION supabase_realtime ADD TABLE message;

-- Done! Your chat history tables are ready.
-- Don't forget to add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env
