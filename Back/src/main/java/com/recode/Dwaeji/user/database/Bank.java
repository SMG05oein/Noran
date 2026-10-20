package com.recode.Dwaeji.user.database;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "bank", comment = "은행")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bank {

    @Id
    @Column(name = "bank_code", length = 20, comment = "은행 코드")
    private String bankCode;

    @Column(name = "bank_name", length = 50, nullable = false, unique = true, comment = "은행명")
    private String bankName;

    @Builder.Default
    @Column(name = "sort_order", comment = "정렬 순서")
    private Integer sortOrder = 0;

    @Builder.Default
    @Column(name = "is_active", columnDefinition = "TINYINT", comment = "활성 여부")
    private Integer isActive = 1;
}
