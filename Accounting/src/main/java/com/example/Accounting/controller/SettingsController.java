package com.example.Accounting.controller;

import com.example.Accounting.model.Company;
import com.example.Accounting.model.User;
import com.example.Accounting.model.UserRole;
import com.example.Accounting.repo.CompanyRepo;
import com.example.Accounting.repo.UserRepo;
import com.example.Accounting.security.AccountingPrincipal;
import com.example.Accounting.security.SecurityUtils;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final UserRepo userRepo;
    private final CompanyRepo companyRepo;

    @GetMapping
    public ResponseEntity<SettingsResponse> getSettings() {
        AccountingPrincipal principal = SecurityUtils.currentPrincipal()
                .orElseThrow(() -> new IllegalStateException("Unauthenticated"));

        User user = userRepo.findById(principal.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Company company = user.getCompany();

        UserDto userDto = toUserDto(user);
        CompanyDto companyDto = toCompanyDto(company);
        List<UserDto> users = new ArrayList<>();

        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN) {
            users = userRepo.findByCompanyId(company.getId()).stream()
                    .map(this::toUserDto)
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(SettingsResponse.builder()
                .user(userDto)
                .company(companyDto)
                .users(users)
                .build());
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDto> updateProfile(@RequestBody UserProfileUpdateReq body) {
        AccountingPrincipal principal = SecurityUtils.currentPrincipal()
                .orElseThrow(() -> new IllegalStateException("Unauthenticated"));

        User current = userRepo.findById(principal.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String newEmail = body.getEmail().trim().toLowerCase();
        if (!current.getEmail().equalsIgnoreCase(newEmail)) {
            if (userRepo.existsByEmailIgnoreCaseAndCompanyId(newEmail, principal.getCompanyId())) {
                throw new IllegalArgumentException("Email already in use by another user in this company");
            }
            current.setEmail(newEmail);
        }
        current.setName(body.getName().trim());
        if (body.getPhoneNumber() != null) current.setPhoneNumber(body.getPhoneNumber().trim());
        if (body.getAddr() != null) current.setAddr(body.getAddr().trim());
        
        userRepo.save(current);

        // Update in Firebase Auth
        try {
            var update = new UserRecord.UpdateRequest(current.getFirebaseUid())
                    .setDisplayName(current.getName())
                    .setEmail(current.getEmail());
            FirebaseAuth.getInstance().updateUser(update);
        } catch (Exception e) {
            System.err.println("Failed to update Firebase user: " + e.getMessage());
        }

        return ResponseEntity.ok(toUserDto(current));
    }

    @PutMapping("/company")
    public ResponseEntity<CompanyDto> updateCompany(@RequestBody CompanyProfileUpdateReq body) {
        AccountingPrincipal principal = SecurityUtils.currentPrincipal()
                .orElseThrow(() -> new IllegalStateException("Unauthenticated"));

        if (principal.getRole() != UserRole.ADMIN && principal.getRole() != UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Only admins can edit company profile");
        }

        User current = userRepo.findById(principal.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Company company = current.getCompany();

        company.setName(body.getName().trim());
        company.setEmail(body.getEmail() != null ? body.getEmail().trim() : null);
        company.setPhoneNumber(body.getPhoneNumber() != null ? body.getPhoneNumber().trim() : null);
        company.setAddr(body.getAddr() != null ? body.getAddr().trim() : null);
        company.setRegistrationNumber(body.getRegistrationNumber() != null ? body.getRegistrationNumber().trim() : null);
        company.setCurrency(body.getCurrency() != null ? body.getCurrency().trim() : "USD");
        company.setFiscalYearStart(body.getFiscalYearStart() != null ? body.getFiscalYearStart().trim() : "January");

        companyRepo.save(company);

        return ResponseEntity.ok(toCompanyDto(company));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> removeUser(@PathVariable Long id) {
        AccountingPrincipal principal = SecurityUtils.currentPrincipal()
                .orElseThrow(() -> new IllegalStateException("Unauthenticated"));

        if (principal.getRole() != UserRole.ADMIN && principal.getRole() != UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Only admins can remove users");
        }

        User target = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!target.getCompany().getId().equals(principal.getCompanyId())) {
            throw new IllegalArgumentException("Unauthorized");
        }

        if (target.getId().equals(principal.getUserId())) {
            throw new IllegalArgumentException("Cannot remove yourself");
        }

        // Delete from Firebase Auth
        try {
            FirebaseAuth.getInstance().deleteUser(target.getFirebaseUid());
        } catch (Exception e) {
            System.err.println("Failed to delete Firebase user: " + e.getMessage());
        }

        // Delete from DB
        userRepo.delete(target);

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<UserDto> updateUserRole(@PathVariable Long id, @RequestBody UpdateUserRoleReq body) {
        AccountingPrincipal principal = SecurityUtils.currentPrincipal()
                .orElseThrow(() -> new IllegalStateException("Unauthenticated"));

        if (principal.getRole() != UserRole.ADMIN && principal.getRole() != UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Only admins can modify roles");
        }

        User target = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!target.getCompany().getId().equals(principal.getCompanyId())) {
            throw new IllegalArgumentException("Unauthorized");
        }

        if (target.getId().equals(principal.getUserId())) {
            throw new IllegalArgumentException("Cannot change your own role");
        }

        UserRole newRole = UserRole.valueOf(body.getRole().toUpperCase());
        if (newRole == UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Cannot promote to SUPER_ADMIN");
        }

        target.setRole(newRole);
        userRepo.save(target);

        return ResponseEntity.ok(toUserDto(target));
    }

    @PutMapping("/users/{id}/transfer-admin")
    public ResponseEntity<Void> transferAdmin(@PathVariable Long id) {
        AccountingPrincipal principal = SecurityUtils.currentPrincipal()
                .orElseThrow(() -> new IllegalStateException("Unauthenticated"));

        if (principal.getRole() != UserRole.ADMIN && principal.getRole() != UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Only admins can transfer admin status");
        }

        User target = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!target.getCompany().getId().equals(principal.getCompanyId())) {
            throw new IllegalArgumentException("Unauthorized");
        }

        if (target.getId().equals(principal.getUserId())) {
            throw new IllegalArgumentException("Cannot transfer admin status to yourself");
        }

        User current = userRepo.findById(principal.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Current user not found"));

        target.setRole(UserRole.ADMIN);
        current.setRole(UserRole.STAFF);

        userRepo.save(target);
        userRepo.save(current);

        return ResponseEntity.ok().build();
    }

    private UserDto toUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .addr(user.getAddr())
                .role(user.getRole().name())
                .firebaseUid(user.getFirebaseUid())
                .build();
    }

    private CompanyDto toCompanyDto(Company company) {
        return CompanyDto.builder()
                .id(company.getId())
                .name(company.getName())
                .email(company.getEmail())
                .phoneNumber(company.getPhoneNumber())
                .addr(company.getAddr())
                .registrationNumber(company.getRegistrationNumber())
                .currency(company.getCurrency() != null ? company.getCurrency() : "USD")
                .fiscalYearStart(company.getFiscalYearStart() != null ? company.getFiscalYearStart() : "January")
                .build();
    }

    @Data
    public static class UserProfileUpdateReq {
        private String name;
        private String email;
        private String phoneNumber;
        private String addr;
    }

    @Data
    public static class CompanyProfileUpdateReq {
        private String name;
        private String email;
        private String phoneNumber;
        private String addr;
        private String registrationNumber;
        private String currency;
        private String fiscalYearStart;
    }

    @Data
    public static class UpdateUserRoleReq {
        private String role;
    }

    @Data
    @Builder
    public static class UserDto {
        private Long id;
        private String name;
        private String email;
        private String phoneNumber;
        private String addr;
        private String role;
        private String firebaseUid;
    }

    @Data
    @Builder
    public static class CompanyDto {
        private Long id;
        private String name;
        private String email;
        private String phoneNumber;
        private String addr;
        private String registrationNumber;
        private String currency;
        private String fiscalYearStart;
    }

    @Data
    @Builder
    public static class SettingsResponse {
        private UserDto user;
        private CompanyDto company;
        private List<UserDto> users;
    }
}
