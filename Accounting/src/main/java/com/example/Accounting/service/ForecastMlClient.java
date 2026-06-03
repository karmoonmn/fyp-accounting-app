package com.example.Accounting.service;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class ForecastMlClient {

    private final RestTemplate restTemplate;
    
    // In production, this would be injected via application.yml
    private final String mlServiceUrl = "http://127.0.0.1:8001/predict";

    public ForecastMlClient() {
        this.restTemplate = new RestTemplate();
    }

    public MlPredictResponse predict(MlPredictRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<MlPredictRequest> entity = new HttpEntity<>(request, headers);
        
        try {
            return restTemplate.postForObject(mlServiceUrl, entity, MlPredictResponse.class);
        } catch (Exception e) {
            System.err.println("Failed to call ML Service: " + e.getMessage());
            // Return empty fallback instead of crashing
            return new MlPredictResponse();
        }
    }

    @Data
    public static class MlPredictRequest {
        private String companyId;
        private String forecastType;
        private String category;
        private int monthsAhead;
        private List<Map<String, Object>> historicalData;
    }

    @Data
    public static class MlPredictResponse {
        private String category;
        private Map<String, Object> metrics;
        private List<MlPredictionPoint> predictions;
    }

    @Data
    public static class MlPredictionPoint {
        private String month;
        private BigDecimal predictedAmount;
    }
}
