package com.example.Accounting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CustomerReq {
    private String name;
    private String email;
    private String phoneNum;
    private String addr;
}
