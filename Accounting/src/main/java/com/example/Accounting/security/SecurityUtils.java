package com.example.Accounting.security;

import com.example.Accounting.model.UserRole;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<AccountingPrincipal> currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof UsernamePasswordAuthenticationToken token
                && token.getPrincipal() instanceof AccountingPrincipal p) {
            return Optional.of(p);
        }
        return Optional.empty();
    }

    public static Long requireCompanyId() {
        return currentPrincipal()
                .map(AccountingPrincipal::getCompanyId)
                .orElseThrow(() -> new IllegalStateException("No company in security context"));
    }

    public static boolean hasRole(UserRole role) {
        return currentPrincipal().map(p -> p.getRole() == role).orElse(false);
    }
}
