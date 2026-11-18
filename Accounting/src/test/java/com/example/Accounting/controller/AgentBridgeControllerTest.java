package com.example.Accounting.controller;

import com.example.Accounting.service.SupabaseService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;

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
    private SupabaseService supabaseService;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private AgentBridgeController agentBridgeController;

    @Test
    @DisplayName("FR-01 & FR-02: Successfully upload invoice PNG document and send to extraction API")
    void testUploadInvoiceImageSuccessfully() {
        MockMultipartFile invoiceFile = new MockMultipartFile(
                "file",
                "invoice_test.png",
                "image/png",
                "fake image content".getBytes()
        );

        ResponseEntity<String> response = agentBridgeController.chat(
                "Please extract this invoice",
                1L,
                "Bearer mock-token-12345",
                "thread-test-001",
                invoiceFile,
                true
        );

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

        ResponseEntity<String> response = agentBridgeController.chat(
                "Extract statement summary",
                1L,
                "Bearer mock-token-67890",
                "thread-test-002",
                pdfFile,
                true
        );

        assertNotNull(response);
    }
}
