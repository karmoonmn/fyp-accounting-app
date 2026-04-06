package com.example.Accounting.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Component
public class FirebaseConfig {

    @PostConstruct
    public void init() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }
        try (InputStream in = openCredentialsStream()) {
            if (in == null) {
                log.warn(
                        "Firebase credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS to your JSON path, "
                                + "place firebase-service-account.json in the process working directory, "
                                + "or add src/main/resources/firebase-service-account.json (classpath root). "
                                + "ID token verification is unavailable until credentials are provided.");
                return;
            }
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(in))
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase Admin SDK initialized");
        } catch (IOException e) {
            log.error("Failed to initialize Firebase Admin SDK", e);
        }
    }

    private static InputStream openCredentialsStream() throws IOException {
        String envPath = System.getenv("GOOGLE_APPLICATION_CREDENTIALS");
        if (envPath != null && !envPath.isBlank()) {
            Path p = Paths.get(envPath);
            if (Files.isRegularFile(p)) {
                return Files.newInputStream(p);
            }
        }
        Path local = Paths.get("firebase-service-account.json");
        if (Files.isRegularFile(local)) {
            return Files.newInputStream(local);
        }
        ClassPathResource cp = new ClassPathResource("firebase-service-account.json");
        if (cp.exists()) {
            return cp.getInputStream();
        }
        return null;
    }

    public static boolean firebaseInitialized() {
        return !FirebaseApp.getApps().isEmpty();
    }
}
