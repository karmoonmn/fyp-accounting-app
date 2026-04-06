package com.example.Accounting.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {

    /**
     * When true and {@link #devAdminKey} is non-empty, requests may authenticate as SUPER_ADMIN
     * using header {@code X-Dev-Admin-Key}.
     * Disable in every deployed environment.
     */
    private boolean devAdminEnabled = false;

    /**
     * Shared secret for dev-only super-admin access (e.g. long random string).
     */
    private String devAdminKey = "";
}
