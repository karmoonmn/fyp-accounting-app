package com.example.Accounting.config;

import com.example.Accounting.model.User;
import com.example.Accounting.model.UserRole;
import com.example.Accounting.repo.UserRepo;
import com.example.Accounting.security.AccountingPrincipal;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class FirebaseAuthFilter extends OncePerRequestFilter {

    public static final String HEADER_DEV_ADMIN_KEY = "X-Dev-Admin-Key";
    public static final String HEADER_COMPANY_ID = "X-Company-Id";

    private enum AuthOutcome {
        /** No dev key / no bearer; leave context unchanged. */
        ANONYMOUS,
        /** SecurityContext set; proceed with filter chain. */
        AUTHENTICATED,
        /** Response already written with error status; stop chain. */
        REJECTED
    }

    private final AuthProperties authProperties;
    private final UserRepo userRepo;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod()) && pathWithoutContext(request).equals("/auth/register-company");
    }

    private static String pathWithoutContext(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && uri.startsWith(context)) {
            return uri.substring(context.length());
        }
        return uri;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() != null
                && SecurityContextHolder.getContext().getAuthentication().isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        AuthOutcome dev = tryDevSuperAdmin(request, response);
        if (dev == AuthOutcome.REJECTED) {
            return;
        }
        if (dev == AuthOutcome.AUTHENTICATED) {
            filterChain.doFilter(request, response);
            return;
        }

        AuthOutcome fb = tryFirebaseBearer(request, response);
        if (fb == AuthOutcome.REJECTED) {
            return;
        }
        if (fb == AuthOutcome.AUTHENTICATED) {
            filterChain.doFilter(request, response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private AuthOutcome tryDevSuperAdmin(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (!authProperties.isDevAdminEnabled()
                || !StringUtils.hasText(authProperties.getDevAdminKey())) {
            return AuthOutcome.ANONYMOUS;
        }
        String key = request.getHeader(HEADER_DEV_ADMIN_KEY);
        if (!StringUtils.hasText(key) || !authProperties.getDevAdminKey().equals(key)) {
            return AuthOutcome.ANONYMOUS;
        }
        String companyHeader = request.getHeader(HEADER_COMPANY_ID);
        if (!StringUtils.hasText(companyHeader)) {
            forbidden(response, "Dev super-admin requires header " + HEADER_COMPANY_ID);
            return AuthOutcome.REJECTED;
        }
        long companyId;
        try {
            companyId = Long.parseLong(companyHeader.trim());
        } catch (NumberFormatException e) {
            forbidden(response, "Invalid " + HEADER_COMPANY_ID);
            return AuthOutcome.REJECTED;
        }
        var authorities = authoritiesFor(UserRole.SUPER_ADMIN);
        var principal = new AccountingPrincipal(null, companyId, null, UserRole.SUPER_ADMIN, true);
        var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
        return AuthOutcome.AUTHENTICATED;
    }

    private AuthOutcome tryFirebaseBearer(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(header) || !header.startsWith("Bearer ")) {
            return AuthOutcome.ANONYMOUS;
        }
        String token = header.substring(7).trim();
        if (!StringUtils.hasText(token)) {
            unauthorized(response, "Empty bearer token");
            return AuthOutcome.REJECTED;
        }
        if (!FirebaseConfig.firebaseInitialized() || FirebaseApp.getApps().isEmpty()) {
            unauthorized(response, "Firebase is not configured on this server");
            return AuthOutcome.REJECTED;
        }
        FirebaseToken decoded;
        try {
            decoded = FirebaseAuth.getInstance().verifyIdToken(token);
        } catch (FirebaseAuthException e) {
            unauthorized(response, "Invalid or expired Firebase ID token");
            return AuthOutcome.REJECTED;
        }
        String uid = decoded.getUid();
        User user = userRepo.findByFirebaseUid(uid).orElse(null);
        if (user == null) {
            forbidden(response, "No application user linked to this Firebase account (set firebase_uid in users)");
            return AuthOutcome.REJECTED;
        }
        if (user.getCompany() == null || user.getCompany().getId() == null) {
            forbidden(response, "User has no company assigned");
            return AuthOutcome.REJECTED;
        }
        UserRole role = user.getRole() != null ? user.getRole() : UserRole.STAFF;
        var principal = new AccountingPrincipal(
                user.getId(),
                user.getCompany().getId(),
                uid,
                role,
                false);
        var auth = new UsernamePasswordAuthenticationToken(principal, null, authoritiesFor(role));
        SecurityContextHolder.getContext().setAuthentication(auth);
        return AuthOutcome.AUTHENTICATED;
    }

    private static List<SimpleGrantedAuthority> authoritiesFor(UserRole role) {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    private static void unauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        writeJsonMessage(response, message);
    }

    private static void forbidden(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        writeJsonMessage(response, message);
    }

    private static void writeJsonMessage(HttpServletResponse response, String message) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"message\":\"" + escapeJson(message) + "\"}");
    }

    private static String escapeJson(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
