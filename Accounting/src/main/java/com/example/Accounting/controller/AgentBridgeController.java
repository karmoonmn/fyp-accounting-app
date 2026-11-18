package com.example.Accounting.controller;

import com.example.Accounting.security.AccountingPrincipal;
import com.example.Accounting.security.SecurityUtils;
import com.example.Accounting.service.SupabaseService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Bridge controller — proxies agent chat requests from the React frontend
 * to the Python agent-service running on port 8002, and persists durable
 * thread history and memory snapshots to Supabase (chat_threads, chat_messages,
 * chat_thread_memory) keyed by thread_id (UUID) and main user_id (int8 / Long).
 */
@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
public class AgentBridgeController {

    @Value("${agent.service.url:http://127.0.0.1:8002}")
    private String agentServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final SupabaseService supabaseService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * POST /api/agent/chat — proxies to agent-service /agent/chat,
     * then persists thread, messages, and memory snapshot keyed by thread_id.
     */
    @PostMapping("/chat")
    public ResponseEntity<String> chat(
            @RequestParam("message") String message,
            @RequestHeader("X-Company-Id") Long companyId,
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(value = "thread_id", required = false) String threadId,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "persist", required = false, defaultValue = "true") boolean persist) {

        String token = authHeader.replace("Bearer ", "");
        Long userId = SecurityUtils.currentPrincipal()
                .map(AccountingPrincipal::getUserId)
                .orElse(null);

        String resolvedThreadId = (threadId != null && !threadId.isBlank())
                ? threadId.trim()
                : UUID.randomUUID().toString();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("message", message);
        body.add("company_id", companyId.toString());
        body.add("auth_token", token);
        body.add("thread_id", resolvedThreadId);

        if (file != null && !file.isEmpty()) {
            try {
                body.add("file", file.getResource());
            } catch (Exception e) {
                // skip file if there's an issue
            }
        }

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    agentServiceUrl + "/agent/chat", request, String.class);

            String responseBody = response.getBody();
            if (persist && userId != null && responseBody != null) {
                try {
                    persistChatTurn(userId, resolvedThreadId, message, responseBody);
                } catch (Exception e) {
                    System.err.println("Failed to persist chat turn to Supabase: " + e.getMessage());
                }
            }

            return ResponseEntity.ok(responseBody);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("{\"error\":\"Agent service unavailable: " + e.getMessage() + "\"}");
        }
    }

    /**
     * POST /api/agent/confirm/{threadId} — proxies to agent-service /agent/confirm/{threadId}
     * and persists the final confirmation response and updated memory snapshot.
     */
    @PostMapping("/confirm/{threadId}")
    public ResponseEntity<String> confirm(
            @PathVariable String threadId,
            @RequestBody Map<String, Object> payload) {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    agentServiceUrl + "/agent/confirm/" + threadId, request, String.class);

            persistPostConfirmation(threadId, response.getBody());
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("{\"error\":\"Agent service unavailable: " + e.getMessage() + "\"}");
        }
    }

    /**
     * POST /api/agent/cancel/{threadId}
     */
    @PostMapping("/cancel/{threadId}")
    public ResponseEntity<String> cancel(@PathVariable String threadId) {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of("action", "cancel");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    agentServiceUrl + "/agent/confirm/" + threadId, request, String.class);

            persistPostConfirmation(threadId, response.getBody());
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("{\"error\":\"Agent service unavailable: " + e.getMessage() + "\"}");
        }
    }

    /**
     * GET /api/agent/history/{threadId}
     */
    @GetMapping("/history/{threadId}")
    public ResponseEntity<String> history(@PathVariable String threadId) {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    agentServiceUrl + "/agent/history/" + threadId, String.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("{\"error\":\"Agent service unavailable: " + e.getMessage() + "\"}");
        }
    }

    /* ── Private persistence helpers ───────────────────────────────────────── */

    private void persistChatTurn(Long userId, String fallbackThreadId, String userText, String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        String tidStr = root.hasNonNull("thread_id") ? root.get("thread_id").asText() : fallbackThreadId;
        UUID tid = UUID.fromString(tidStr);
        String aiText = root.hasNonNull("response") ? root.get("response").asText() : null;
        boolean requiresConfirmation = root.path("requires_confirmation").asBoolean(false);
        JsonNode proposedAction = root.get("proposed_action");

        Instant now = Instant.now();

        // 1. Upsert chat_threads using main userId (int8 / Long)
        supabaseService.upsertThread(tid, userId, buildDefaultTitle(userText));

        // 2. Insert user message row into chat_messages
        supabaseService.insertMessage(tid, "user", userText, now);

        // 3. Insert AI message row into chat_messages
        if (aiText != null) {
            supabaseService.insertMessage(tid, "assistant", aiText, now.plusMillis(1));
        }

        // 4. Upsert chat_thread_memory
        String pendingIntent = null;
        String pendingContext = null;
        if (requiresConfirmation && proposedAction != null && !proposedAction.isNull()) {
            pendingIntent = proposedAction.path("action_type").asText(null);
            pendingContext = objectMapper.writeValueAsString(proposedAction);
        }
        supabaseService.upsertThreadMemory(tid, pendingIntent, pendingContext, null, aiText);
    }

    private void persistPostConfirmation(String threadId, String responseBody) {
        if (responseBody == null || threadId == null || threadId.isBlank()) return;
        try {
            UUID tid = UUID.fromString(threadId);
            JsonNode root = objectMapper.readTree(responseBody);
            String aiText = root.hasNonNull("response") ? root.get("response").asText() : null;
            Instant now = Instant.now();

            if (supabaseService.touchThread(tid) != null) {
                if (aiText != null) {
                    supabaseService.insertMessage(tid, "assistant", aiText, now);
                }
                supabaseService.upsertThreadMemory(tid, null, null, null, aiText);
            }
        } catch (Exception e) {
            System.err.println("Failed to persist post-confirmation chat message: " + e.getMessage());
        }
    }

    private String buildDefaultTitle(String userText) {
        if (userText == null || userText.isBlank()) return "New Chat";
        String cleaned = userText.replaceAll("\\s+", " ").trim();
        return cleaned.length() > 48 ? cleaned.substring(0, 48) + "…" : cleaned;
    }
}
