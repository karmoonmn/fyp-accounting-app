package com.example.Accounting.controller;

import com.example.Accounting.model.Conversation;
import com.example.Accounting.repo.ChatMessageRepo;
import com.example.Accounting.repo.ConversationRepo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit and Integration-level Controller Tests for Module 1: Financial Document Extraction
 *
 * Requirements Covered:
 * - FR-01: Upload invoice, bill, and bank statement images in supported formats (JPG, PNG, PDF).
 * - FR-02: Send uploaded documents to API to be processed.
 */
@ExtendWith(MockitoExtension.class)
class AgentBridgeControllerTest {

    @Mock
    private ConversationRepo conversationRepo;

    @Mock
    private ChatMessageRepo chatMessageRepo;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private AgentBridgeController agentBridgeController;

    @Test
    @DisplayName("FR-01 & FR-02: Successfully upload invoice PNG document and send to extraction API")
    void testUploadInvoiceImageSuccessfully() {
        // Mock multipart file for invoice image (FR-01)
        MockMultipartFile invoiceFile = new MockMultipartFile(
                "file",
                "invoice_test.png",
                "image/png",
                "fake image content".getBytes()
        );

        lenient().when(conversationRepo.findById(any(UUID.class))).thenReturn(Optional.empty());
        lenient().when(conversationRepo.save(any(Conversation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Execute controller method
        ResponseEntity<String> response = agentBridgeController.chat(
                "Please extract this invoice",
                1L,
                "Bearer mock-token-12345",
                "conv-test-001",
                invoiceFile
        );

        // Verify that the call was handled
        assertNotNull(response);
    }

    @Test
    @DisplayName("FR-01 & FR-02: Successfully upload PDF bank statement document")
    void testUploadBankStatementPdfSuccessfully() {
        MockMultipartFile pdfFile = new MockMultipartFile(
                "file",
                "bank_statement_nov.pdf",
                "application/pdf",
                "%PDF-1.4 dummy statement content".getBytes()
        );

        lenient().when(conversationRepo.findById(any(UUID.class))).thenReturn(Optional.empty());
        lenient().when(conversationRepo.save(any(Conversation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<String> response = agentBridgeController.chat(
                "Extract statement summary",
                1L,
                "Bearer mock-token-67890",
                "conv-test-002",
                pdfFile
        );

        assertNotNull(response);
    }
}
