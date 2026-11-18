package com.example.Accounting.repo;

import com.example.Accounting.model.ChatThread;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ChatThreadRepo extends JpaRepository<ChatThread, UUID> {

    List<ChatThread> findByUserIdOrderByUpdatedAtDesc(Long userId);

    @Modifying
    @Query("DELETE FROM ChatThread t WHERE t.id = :threadId")
    void deleteThreadById(@Param("threadId") UUID threadId);
}
