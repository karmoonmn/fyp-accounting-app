package com.example.Accounting.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        // "user" is reserved in PostgreSQL; unquoted SQL breaks (column id does not exist).
        name = "app_users",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_app_users_firebase_uid",
                columnNames = "firebase_uid"
        )
)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Firebase Auth UID; set when the user is provisioned. */
    @Column(name = "firebase_uid", unique = true, length = 128)
    private String firebaseUid;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private UserRole role = UserRole.STAFF;

    private String name;
    private String email;
    private String phoneNumber;
    private String addr;

    @ManyToOne
    @JoinColumn(name = "company_id")
    @JsonBackReference
    private Company company;

}
