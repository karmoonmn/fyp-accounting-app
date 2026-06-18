package com.example.Accounting.controller;

import com.example.Accounting.model.ChatMessage;
import com.example.Accounting.model.Conversation;
import com.example.Accounting.repo.ChatMessageRepo;
import com.example.Accounting.repo.ConversationRepo;
import com.example.Accounting.security.AccountingPrincipal;
import com.example.Accounting.security.SecurityUtils;
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

import java.util.Map;
import java.util.UUID;

/**
 * Bridge controller — proxies agent chat requests from the React frontend
 * to the Python agent-service running on port 8002.
 * <p>
 * After a successful proxy, persists both the user message and AI response
 * to the SQL database (chat_message table). Also manages the agent's thread_id.
 */
@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
public class AgentBridgeController {

    @Value("${agent.service.url:http://127.0.0.1:8002}")
    private String agentServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ConversationRepo conversationRepo;
    private final ChatMessageRepo chatMessageRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * POST /api/agent/chat — proxies to agent-service /agent/chat,
     * then saves both the user message and AI response to SQL.
     */
    @PostMapping("/chat")
    public ResponseEntity<String> chat(
            @RequestParam("message") String message,
            @RequestHeader("X-Company-Id") Long companyId,
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(value = "conversation_id", required = false) String conversationId,
            @RequestParam(value = "file", required = false) MultipartFile file) {

        String token = authHeader.replace("Bearer ", "");

        // Get current user
        String firebaseUid = SecurityUtils.currentPrincipal()
                .map(AccountingPrincipal::getFirebaseUid)
                .orElse(null);

        // Resolve or create conversation
        Conversation conv = resolveConversation(conversationId, firebaseUid);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("message", message);
        body.add("company_id", companyId.toString());
        body.add("auth_token", token);
        
        // Use the thread_id associated with this conversation if it exists
        if (conv.getThreadId() != null && !conv.getThreadId().isBlank()) {
            body.add("thread_id", conv.getThreadId());
        }

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

            // ── Persist messages to SQL ───────────────────────────────────
            try {
                if (firebaseUid != null) {
                    // Extract threadId from response if it wasn't set on the conversation
                    String agentThreadId = extractThreadId(response.getBody());
                    if (agentThreadId != null && (conv.getThreadId() == null || !conv.getThreadId().equals(agentThreadId))) {
                        conv.setThreadId(agentThreadId);
                        conversationRepo.save(conv);
                    }

                    // Save user message
                    ChatMessage userMsg = new ChatMessage();
                    userMsg.setConversationId(conv.getId());
                    userMsg.setRole("user");
                    userMsg.setContent(message);
                    chatMessageRepo.save(userMsg);

                    // Save AI response
                    String aiText = extractAiResponse(response.getBody());
                    if (aiText != null) {
                        ChatMessage aiMsg = new ChatMessage();
                        aiMsg.setConversationId(conv.getId());
                        aiMsg.setRole("assistant");
                        aiMsg.setContent(aiText);
                        chatMessageRepo.save(aiMsg);
                    }

                    // Inject conversation_id into the response so frontend can track it
                    String enrichedBody = injectConversationId(response.getBody(), conv.getId());
                    return ResponseEntity.ok(enrichedBody);
                }
            } catch (Exception e) {
                // Don't fail the chat if persistence fails — log and return original
                System.err.println("Failed to persist chat messages: " + e.getMessage());
            }

            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("{\"error\":\"Agent service unavailable: " + e.getMessage() + "\"}");
        }
    }

    /**
     * POST /api/agent/confirm/{threadId} — proxies to agent-service /agent/confirm/{threadId}
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

    /* ── Private helpers ───────────────────────────────────────────────────── */

    private Conversation resolveConversation(String conversationId, String firebaseUid) {
        if (conversationId != null && !conversationId.isBlank()) {
            try {
                UUID id = UUID.fromString(conversationId);
                return conversationRepo.findById(id).orElseGet(() -> {
                    Conversation conv = new Conversation();
                    conv.setUserId(firebaseUid);
                    return conversationRepo.save(conv);
                });
            } catch (IllegalArgumentException ignored) {}
        }
        // Create a new conversation
        Conversation conv = new Conversation();
        conv.setUserId(firebaseUid);
        return conversationRepo.save(conv);
    }

    private String extractAiResponse(String responseBody) {
        if (responseBody == null) return null;
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            if (node.has("response")) return node.get("response").asText();
        } catch (Exception ignored) {}
        return null;
    }

    private String extractThreadId(String responseBody) {
        if (responseBody == null) return null;
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            if (node.has("thread_id")) return node.get("thread_id").asText();
        } catch (Exception ignored) {}
        return null;
    }

    private String injectConversationId(String responseBody, UUID convId) {
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            var objNode = objectMapper.createObjectNode();
            node.fields().forEachRemaining(e -> objNode.set(e.getKey(), e.getValue()));
            objNode.put("conversation_id", convId.toString());
            return objectMapper.writeValueAsString(objNode);
        } catch (Exception e) {
            return responseBody;
        }
    }
}
