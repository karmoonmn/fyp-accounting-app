package com.example.Accounting.repo;

import com.example.Accounting.model.ChatThreadMemory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ChatThreadMemoryRepo extends JpaRepository<ChatThreadMemory, UUID> {

    @Modifying
    @Query("DELETE FROM ChatThreadMemory m WHERE m.threadId = :threadId")
    void deleteByThreadId(@Param("threadId") UUID threadId);
}
