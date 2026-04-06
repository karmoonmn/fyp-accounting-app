package com.example.Accounting.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.List;

@Entity
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class JournalEntry extends Transaction {

    @OneToMany(mappedBy = "journalEntry", cascade = CascadeType.ALL)
    @JsonManagedReference
    private List<JournalLine> lines;

    private BigDecimal totalDebit;
    private BigDecimal totalCredit;
}
