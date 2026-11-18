package com.example.Accounting.repo;

import com.example.Accounting.model.ChatThreadMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ChatThreadMessageRepo extends JpaRepository<ChatThreadMessage, UUID> {

    List<ChatThreadMessage> findByThreadIdOrderByCreatedAtAsc(UUID threadId);

    @Modifying
    @Query("DELETE FROM ChatThreadMessage m WHERE m.threadId = :threadId")
    void deleteByThreadId(@Param("threadId") UUID threadId);
}
