package com.example.Accounting.controller;

import com.example.Accounting.model.User;
import com.example.Accounting.repo.CompanyRepo;
import com.example.Accounting.repo.UserRepo;
import com.example.Accounting.request.RegisterCompanyRequest;
import com.example.Accounting.request.RegisterUserRequest;
import com.example.Accounting.security.AccountingPrincipal;
import com.example.Accounting.security.SecurityUtils;
import com.example.Accounting.service.AuthRegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthRegistrationService authRegistrationService;
    private final UserRepo userRepo;
    private final CompanyRepo companyRepo;

    @GetMapping("/me")
    public MeResponse me() {
        AccountingPrincipal p = SecurityUtils.currentPrincipal()
                .orElseThrow(() -> new IllegalStateException("Unauthenticated"));
                
        String userName = null;
        if (p.getUserId() != null) {
            userName = userRepo.findById(p.getUserId()).map(User::getName).orElse(null);
        }
        
        String companyName = null;
        if (p.getCompanyId() != null) {
            companyName = companyRepo.findById(p.getCompanyId()).map(c -> c.getName()).orElse(null);
        }

        return MeResponse.builder()
                .userId(p.getUserId())
                .companyId(p.getCompanyId())
                .firebaseUid(p.getFirebaseUid())
                .role(p.getRole().name())
                .devSuperAdmin(p.isDevSuperAdmin())
                .userName(userName)
                .companyName(companyName)
                .build();
    }

    @PostMapping("/register-company")
    public RegisterCompanyResponse registerCompany(
            HttpServletRequest request,
            @Valid @RequestBody RegisterCompanyRequest body) {
        String token = bearerToken(request);
        var company = authRegistrationService.registerCompany(body, token);
        return RegisterCompanyResponse.builder()
                .companyId(company.getId())
                .companyName(company.getName())
                .build();
    }

    @PostMapping("/register-user")
    public RegisterUserResponse registerUser(
            @Valid @RequestBody RegisterUserRequest body) {
        AccountingPrincipal p = SecurityUtils.currentPrincipal()
                .orElseThrow(() -> new IllegalStateException("Unauthenticated"));
        User user = authRegistrationService.registerUserForCompany(body, p);
        return RegisterUserResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    private static String bearerToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(header) || !header.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Authorization Bearer token required");
        }
        return header.substring(7).trim();
    }

    @Data
    @Builder
    public static class MeResponse {
        private Long userId;
        private Long companyId;
        private String firebaseUid;
        private String role;
        private boolean devSuperAdmin;
        private String userName;
        private String companyName;
    }

    @Data
    @Builder
    public static class RegisterCompanyResponse {
        private Long companyId;
        private String companyName;
    }

    @Data
    @Builder
    public static class RegisterUserResponse {
        private Long userId;
        private String email;
        private String role;
    }
}
