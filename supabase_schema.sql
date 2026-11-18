-- Supabase Chat Schema (matching existing chat_threads & chat_messages shape)

ALTER TABLE IF EXISTS chat_threads DROP COLUMN IF EXISTS last_message_at;

-- chat_threads
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  role VARCHAR,
  content VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- chat_thread_memory
CREATE TABLE IF NOT EXISTS chat_thread_memory (
  thread_id UUID PRIMARY KEY REFERENCES chat_threads(id) ON DELETE CASCADE,
  pending_intent TEXT,
  pending_context JSONB,
  conversation_summary TEXT,
  last_response TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
