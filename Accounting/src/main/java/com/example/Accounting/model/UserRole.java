package com.example.Accounting.model;

public enum UserRole {
    /** Platform owner / local testing via dev key only — do not assign to normal Firebase users in production. */
    SUPER_ADMIN,
    /** Full access within the company, including DELETE. */
    ADMIN,
    /** Read and mutate except HTTP DELETE. */
    STAFF
}
