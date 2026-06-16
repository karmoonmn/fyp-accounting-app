package com.example.Accounting.repo;

import com.example.Accounting.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepo extends JpaRepository<User, Long> {

    @Query("SELECT u FROM User u JOIN FETCH u.company WHERE u.firebaseUid = :uid")
    Optional<User> findByFirebaseUid(@Param("uid") String firebaseUid);

    boolean existsByFirebaseUid(String firebaseUid);

    boolean existsByEmailIgnoreCaseAndCompanyId(String email, Long companyId);

    List<User> findByCompanyId(Long companyId);
}
