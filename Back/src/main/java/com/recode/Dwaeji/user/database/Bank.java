package com.recode.Dwaeji.user.database;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bank")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bank {

    @Id
    @Column(name = "bank_code", length = 20)
    private String bankCode;

    @Column(name = "bank_name", length = 50, nullable = false, unique = true)
    private String bankName;

    @Builder.Default
    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Builder.Default
    @Column(name = "is_active", columnDefinition = "TINYINT")
    private Integer isActive = 1;
}
