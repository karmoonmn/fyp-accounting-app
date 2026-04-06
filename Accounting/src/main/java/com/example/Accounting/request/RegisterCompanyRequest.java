package com.example.Accounting.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterCompanyRequest {

    @NotBlank
    @Size(max = 255)
    private String companyName;

    @Size(max = 255)
    private String companyEmail;

    @Size(max = 64)
    private String companyPhone;

    @Size(max = 512)
    private String companyAddr;

    /** Display name for the first admin user; defaults to Firebase email if blank. */
    @Size(max = 255)
    private String adminName;
}
