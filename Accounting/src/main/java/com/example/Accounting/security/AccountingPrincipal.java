package com.example.Accounting.security;

import com.example.Accounting.model.UserRole;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.io.Serializable;

@Getter
@RequiredArgsConstructor
public class AccountingPrincipal implements Serializable {

    private final Long userId;
    private final Long companyId;
    private final String firebaseUid;
    private final UserRole role;
    /** Dev-key flow: no row in {@code users} yet. */
    private final boolean devSuperAdmin;
}
