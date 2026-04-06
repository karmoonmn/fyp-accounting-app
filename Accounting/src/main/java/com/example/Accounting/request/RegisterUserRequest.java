package com.example.Accounting.request;

import com.example.Accounting.model.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterUserRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6, max = 128)
    private String password;

    @NotBlank
    @Size(max = 255)
    private String name;

    @Size(max = 64)
    private String phoneNumber;

    @Size(max = 512)
    private String addr;

    /** Defaults to STAFF; cannot be SUPER_ADMIN. */
    private UserRole role;
}
