package com.example.Accounting.controller;

import com.example.Accounting.model.ChatThread;
import com.example.Accounting.model.ChatThreadMemory;
import com.example.Accounting.model.ChatThreadMessage;
import com.example.Accounting.security.AccountingPrincipal;
import com.example.Accounting.security.SecurityUtils;
import com.example.Accounting.service.SupabaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * REST endpoints for managing chat threads (tabs), messages, and per-thread memory snapshots
 * backed by Supabase (chat_threads, chat_messages, chat_thread_memory).
 */
@RestController
@RequestMapping("/api/threads")
@RequiredArgsConstructor
public class ThreadController {

    private final SupabaseService supabaseService;

    /* ── Helpers ───────────────────────────────────────────────────────────── */

    private Long currentUserId() {
        return SecurityUtils.currentPrincipal()
                .map(AccountingPrincipal::getUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private UUID parseThreadUuid(String threadId) {
        try {
            return UUID.fromString(threadId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid thread UUID: " + threadId);
        }
    }

    private ChatThread ownedThread(String threadId) {
        UUID uuid = parseThreadUuid(threadId);
        ChatThread thread = supabaseService.getThread(uuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Thread not found"));
        Long uid = currentUserId();
        if (thread.getUserId() != null && !thread.getUserId().equals(uid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your chat thread");
        }
        return thread;
    }

    /* ── Thread CRUD ───────────────────────────────────────────────────────── */

    /** GET /api/threads — list user's threads (calls Supabase) */
    @GetMapping
    public List<ChatThread> list() {
        return supabaseService.listThreadsForUser(currentUserId());
    }

    /** POST /api/threads — create or register a new empty chat thread tab */
    @PostMapping
    public ChatThread create(@RequestBody(required = false) Map<String, String> body) {
        Long uid = currentUserId();
        UUID threadId = (body != null && body.get("id") != null && !body.get("id").isBlank())
                ? parseThreadUuid(body.get("id").trim())
                : UUID.randomUUID();
        String title = (body != null && body.get("title") != null && !body.get("title").isBlank())
                ? body.get("title").trim()
                : "New Chat";

        return supabaseService.upsertThread(threadId, uid, title);
    }

    /** GET /api/threads/{threadId} — get a single thread by thread_id */
    @GetMapping("/{threadId}")
    public ChatThread get(@PathVariable String threadId) {
        return ownedThread(threadId);
    }

    /** PATCH /api/threads/{threadId} — update title (calls Supabase) */
    @PatchMapping("/{threadId}")
    public ChatThread updateTitle(@PathVariable String threadId, @RequestBody Map<String, String> body) {
        ChatThread thread = ownedThread(threadId);
        String title = body.getOrDefault("title", thread.getTitle());
        return supabaseService.updateThreadTitle(thread, title);
    }

    /** DELETE /api/threads/{threadId} — delete thread + cascade (calls Supabase) */
    @DeleteMapping("/{threadId}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable String threadId) {
        Long uid = currentUserId();
        UUID uuid = parseThreadUuid(threadId);
        Optional<ChatThread> opt = supabaseService.getThread(uuid);
        if (opt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        if (opt.get().getUserId() != null && !opt.get().getUserId().equals(uid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your chat thread");
        }
        supabaseService.deleteThreadCascade(uuid);
        return ResponseEntity.noContent().build();
    }

    /* ── Thread Messages & Memory ──────────────────────────────────────────── */

    /** GET /api/threads/{threadId}/messages — get messages for a thread (calls Supabase) */
    @GetMapping("/{threadId}/messages")
    public List<ChatThreadMessage> messages(@PathVariable String threadId) {
        ChatThread thread = ownedThread(threadId);
        return supabaseService.getMessages(thread.getId());
    }

    /** GET /api/threads/{threadId}/memory — get latest memory snapshot for a thread */
    @GetMapping("/{threadId}/memory")
    public ResponseEntity<ChatThreadMemory> memory(@PathVariable String threadId) {
        ChatThread thread = ownedThread(threadId);
        return supabaseService.getThreadMemory(thread.getId())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
