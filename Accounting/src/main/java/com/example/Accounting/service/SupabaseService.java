package com.example.Accounting.service;

import com.example.Accounting.model.ChatThread;
import com.example.Accounting.model.ChatThreadMemory;
import com.example.Accounting.model.ChatThreadMessage;
import com.example.Accounting.repo.ChatThreadMemoryRepo;
import com.example.Accounting.repo.ChatThreadMessageRepo;
import com.example.Accounting.repo.ChatThreadRepo;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service layer for interacting with Supabase tables:
 * - chat_threads (id uuid, user_id bigint/int8, title text, created_at timestamptz, updated_at timestamptz)
 * - chat_messages (id uuid, thread_id uuid, role varchar, content varchar, created_at timestamptz, updated_at timestamptz)
 * - chat_thread_memory (thread_id uuid, pending_intent text, pending_context jsonb, conversation_summary text, last_response text, updated_at timestamptz)
 */
@Service
@RequiredArgsConstructor
public class SupabaseService {

    @Value("${supabase.url:https://yaienyqqevrvbbfrlezm.supabase.co}")
    private String supabaseUrl;

    @Value("${supabase.service-key:}")
    private String supabaseServiceKey;

    private final ChatThreadRepo chatThreadRepo;
    private final ChatThreadMessageRepo chatThreadMessageRepo;
    private final ChatThreadMemoryRepo chatThreadMemoryRepo;
    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureTablesExist() {
        try {
            // Remove last_message_at if it was previously added by Hibernate
            jdbcTemplate.execute("ALTER TABLE IF EXISTS chat_threads DROP COLUMN IF EXISTS last_message_at");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS chat_thread_memory ALTER COLUMN thread_id TYPE uuid USING thread_id::uuid");

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS chat_threads (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  user_id BIGINT,
                  title TEXT,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  updated_at TIMESTAMPTZ
                )
            """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
                  role VARCHAR,
                  content VARCHAR,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  updated_at TIMESTAMPTZ
                )
            """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS chat_thread_memory (
                  thread_id UUID PRIMARY KEY REFERENCES chat_threads(id) ON DELETE CASCADE,
                  pending_intent TEXT,
                  pending_context JSONB,
                  conversation_summary TEXT,
                  last_response TEXT,
                  updated_at TIMESTAMPTZ DEFAULT now()
                )
            """);
        } catch (Exception e) {
            System.err.println("SupabaseService schema check skipped: " + e.getMessage());
        }
    }

    @Transactional
    public ChatThread upsertThread(UUID threadId, Long userId, String defaultTitle) {
        Instant now = Instant.now();
        ChatThread thread = chatThreadRepo.findById(threadId).orElseGet(() -> {
            ChatThread t = new ChatThread();
            t.setId(threadId);
            t.setUserId(userId);
            t.setCreatedAt(now);
            return t;
        });
        if (thread.getUserId() == null && userId != null) {
            thread.setUserId(userId);
        }
        if ((thread.getTitle() == null || thread.getTitle().isBlank()) && defaultTitle != null && !defaultTitle.isBlank()) {
            thread.setTitle(defaultTitle);
        }
        thread.setUpdatedAt(now);
        return chatThreadRepo.save(thread);
    }

    @Transactional
    public ChatThread touchThread(UUID threadId) {
        Instant now = Instant.now();
        return chatThreadRepo.findById(threadId).map(thread -> {
            thread.setUpdatedAt(now);
            return chatThreadRepo.save(thread);
        }).orElse(null);
    }

    @Transactional
    public ChatThreadMessage insertMessage(UUID threadId, String role, String content, Instant timestamp) {
        Instant ts = timestamp != null ? timestamp : Instant.now();
        ChatThreadMessage msg = new ChatThreadMessage();
        msg.setThreadId(threadId);
        msg.setRole(role);
        msg.setContent(content);
        msg.setCreatedAt(ts);
        msg.setUpdatedAt(ts);
        return chatThreadMessageRepo.save(msg);
    }

    @Transactional
    public ChatThreadMemory upsertThreadMemory(
            UUID threadId,
            String pendingIntent,
            String pendingContext,
            String conversationSummary,
            String lastResponse) {
        Instant now = Instant.now();
        ChatThreadMemory memory = chatThreadMemoryRepo.findById(threadId).orElseGet(() -> {
            ChatThreadMemory m = new ChatThreadMemory();
            m.setThreadId(threadId);
            return m;
        });
        memory.setPendingIntent(pendingIntent);
        memory.setPendingContext(pendingContext);
        if (conversationSummary != null) {
            memory.setConversationSummary(conversationSummary);
        }
        memory.setLastResponse(lastResponse);
        memory.setUpdatedAt(now);
        return chatThreadMemoryRepo.save(memory);
    }

    public List<ChatThread> listThreadsForUser(Long userId) {
        return chatThreadRepo.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public Optional<ChatThread> getThread(UUID threadId) {
        return chatThreadRepo.findById(threadId);
    }

    @Transactional
    public ChatThread updateThreadTitle(ChatThread thread, String title) {
        thread.setTitle(title);
        thread.setUpdatedAt(Instant.now());
        return chatThreadRepo.save(thread);
    }

    @Transactional
    public void deleteThreadCascade(UUID threadId) {
        chatThreadMessageRepo.deleteByThreadId(threadId);
        chatThreadMemoryRepo.deleteByThreadId(threadId);
        chatThreadRepo.deleteThreadById(threadId);
        chatThreadRepo.flush();
    }

    public List<ChatThreadMessage> getMessages(UUID threadId) {
        return chatThreadMessageRepo.findByThreadIdOrderByCreatedAtAsc(threadId);
    }

    public Optional<ChatThreadMemory> getThreadMemory(UUID threadId) {
        return chatThreadMemoryRepo.findById(threadId);
    }
}
