package com.example.Accounting.controller;

import com.example.Accounting.model.ChatMessage;
import com.example.Accounting.model.Conversation;
import com.example.Accounting.repo.ChatMessageRepo;
import com.example.Accounting.repo.ConversationRepo;
import com.example.Accounting.security.AccountingPrincipal;
import com.example.Accounting.security.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST endpoints for reading / managing chat conversations and messages.
 * Messages are persisted by AgentBridgeController after each chat proxy;
 * this controller is for the frontend to list, read, and delete them.
 */
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ChatController {

    private final ConversationRepo conversationRepo;
    private final ChatMessageRepo chatMessageRepo;

    /* ── helpers ────────────────────────────────────────────────────────────── */

    private String currentFirebaseUid() {
        return SecurityUtils.currentPrincipal()
                .map(AccountingPrincipal::getFirebaseUid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private Conversation ownedConversation(UUID id) {
        Conversation conv = conversationRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        if (!conv.getUserId().equals(currentFirebaseUid())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your conversation");
        }
        return conv;
    }

    /* ── conversations ─────────────────────────────────────────────────────── */

    /** List all conversations for the authenticated user. */
    @GetMapping
    public List<Conversation> list() {
        return conversationRepo.findByUserIdOrderByCreatedAtDesc(currentFirebaseUid());
    }

    /** Get a single conversation by ID. */
    @GetMapping("/{id}")
    public Conversation get(@PathVariable UUID id) {
        return ownedConversation(id);
    }

    /** Update conversation title. */
    @PatchMapping("/{id}")
    public Conversation updateTitle(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        Conversation conv = ownedConversation(id);
        if (body.containsKey("title")) {
            conv.setTitle(body.get("title"));
        }
        return conversationRepo.save(conv);
    }

    /** Delete a conversation and all its messages. */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Conversation conv = ownedConversation(id);
        chatMessageRepo.deleteByConversationId(conv.getId());
        conversationRepo.delete(conv);
        return ResponseEntity.noContent().build();
    }

    /* ── messages ──────────────────────────────────────────────────────────── */

    /** Get all messages for a conversation, ordered chronologically. */
    @GetMapping("/{id}/messages")
    public List<ChatMessage> messages(@PathVariable UUID id) {
        ownedConversation(id); // ownership check
        return chatMessageRepo.findByConversationIdOrderByCreatedAtAsc(id);
    }
}
