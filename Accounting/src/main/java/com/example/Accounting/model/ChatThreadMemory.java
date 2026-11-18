package com.example.Accounting.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "chat_thread_memory")
public class ChatThreadMemory {

    @Id
    @Column(name = "thread_id", nullable = false, columnDefinition = "uuid")
    private UUID threadId;

    @Column(name = "pending_intent")
    private String pendingIntent;

    @Column(name = "pending_context", columnDefinition = "TEXT")
    private String pendingContext;

    @Column(name = "conversation_summary", columnDefinition = "TEXT")
    private String conversationSummary;

    @Column(name = "last_response", columnDefinition = "TEXT")
    private String lastResponse;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        this.updatedAt = Instant.now();
    }
}
