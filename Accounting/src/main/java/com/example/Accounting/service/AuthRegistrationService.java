package com.example.Accounting.service;

import com.example.Accounting.config.FirebaseConfig;
import com.example.Accounting.model.Company;
import com.example.Accounting.model.User;
import com.example.Accounting.model.UserRole;
import com.example.Accounting.repo.CompanyRepo;
import com.example.Accounting.repo.UserRepo;
import com.example.Accounting.request.RegisterCompanyRequest;
import com.example.Accounting.request.RegisterUserRequest;
import com.example.Accounting.security.AccountingPrincipal;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AuthRegistrationService {

    private final CompanyRepo companyRepo;
    private final UserRepo userRepo;

    @Transactional
    public Company registerCompany(RegisterCompanyRequest body, String idToken) {
        requireFirebase();
        FirebaseToken decoded = verifyToken(idToken);
        String uid = decoded.getUid();
        if (userRepo.existsByFirebaseUid(uid)) {
            throw new IllegalArgumentException("This Firebase account is already linked to a user");
        }
        String emailFromToken = decoded.getEmail();
        Company company = new Company();
        company.setName(body.getCompanyName().trim());
        company.setEmail(StringUtils.hasText(body.getCompanyEmail()) ? body.getCompanyEmail().trim() : emailFromToken);
        company.setPhoneNumber(body.getCompanyPhone());
        company.setAddr(body.getCompanyAddr());
        company = companyRepo.save(company);

        User admin = new User();
        admin.setFirebaseUid(uid);
        admin.setRole(UserRole.ADMIN);
        admin.setName(StringUtils.hasText(body.getAdminName()) ? body.getAdminName().trim()
                : (StringUtils.hasText(emailFromToken) ? emailFromToken : "Admin"));
        admin.setEmail(StringUtils.hasText(emailFromToken) ? emailFromToken : body.getCompanyEmail());
        admin.setPhoneNumber(body.getCompanyPhone());
        admin.setAddr(body.getCompanyAddr());
        admin.setCompany(company);
        userRepo.save(admin);
        return company;
    }

    @Transactional
    public User registerUserForCompany(RegisterUserRequest body, AccountingPrincipal principal) {
        requireFirebase();
        if (principal.getRole() != UserRole.ADMIN && principal.getRole() != UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Only company admins can register users");
        }
        if (principal.getCompanyId() == null) {
            throw new IllegalArgumentException("No company in context");
        }
        UserRole role = body.getRole() != null ? body.getRole() : UserRole.STAFF;
        if (role == UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Cannot assign SUPER_ADMIN via this endpoint");
        }
        String email = body.getEmail().trim().toLowerCase();
        if (userRepo.existsByEmailIgnoreCaseAndCompanyId(email, principal.getCompanyId())) {
            throw new IllegalArgumentException("A user with this email already exists in your company");
        }
        UserRecord firebaseUser;
        try {
            var create = new UserRecord.CreateRequest()
                    .setEmail(email)
                    .setPassword(body.getPassword())
                    .setDisplayName(body.getName().trim())
                    .setEmailVerified(false);
            firebaseUser = FirebaseAuth.getInstance().createUser(create);
        } catch (FirebaseAuthException e) {
            String code = e.getAuthErrorCode() != null ? e.getAuthErrorCode().name() : "";
            if (code.contains("EMAIL_ALREADY_EXISTS") || code.contains("EMAIL_EXISTS")) {
                throw new IllegalArgumentException("This email is already registered in Firebase");
            }
            throw new IllegalArgumentException("Could not create Firebase user: " + e.getMessage());
        }
        Company company = companyRepo.findById(principal.getCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        User user = new User();
        user.setFirebaseUid(firebaseUser.getUid());
        user.setRole(role);
        user.setName(body.getName().trim());
        user.setEmail(email);
        user.setPhoneNumber(body.getPhoneNumber());
        user.setAddr(body.getAddr());
        user.setCompany(company);
        return userRepo.save(user);
    }

    private static void requireFirebase() {
        if (!FirebaseConfig.firebaseInitialized()) {
            throw new IllegalStateException("Firebase is not configured on this server");
        }
    }

    private static FirebaseToken verifyToken(String idToken) {
        if (!StringUtils.hasText(idToken)) {
            throw new IllegalArgumentException("Missing Firebase ID token");
        }
        try {
            return FirebaseAuth.getInstance().verifyIdToken(idToken);
        } catch (FirebaseAuthException e) {
            throw new IllegalArgumentException("Invalid or expired Firebase ID token");
        }
    }
}
