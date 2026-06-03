package com.example.Accounting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Bridge controller — proxies agent chat requests from the React frontend
 * to the Python agent-service running on port 8002.
 * <p>
 * This avoids CORS issues and lets the frontend use the same auth
 * (Firebase token) without knowing about the agent service directly.
 */
@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
public class AgentBridgeController {

    @Value("${agent.service.url:http://127.0.0.1:8002}")
    private String agentServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * POST /api/agent/chat — proxies to agent-service /agent/chat
     */
    @PostMapping("/chat")
    public ResponseEntity<String> chat(
            @RequestParam("message") String message,
            @RequestHeader("X-Company-Id") Long companyId,
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(value = "threadId", required = false) String threadId,
            @RequestParam(value = "file", required = false) MultipartFile file) {

        String token = authHeader.replace("Bearer ", "");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("message", message);
        body.add("company_id", companyId.toString());
        body.add("auth_token", token);
        if (threadId != null) body.add("thread_id", threadId);
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
}
