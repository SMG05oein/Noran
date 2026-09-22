package com.recode.Dwaeji.user.repository;

import java.time.LocalDate;

public interface UserWithSeqProjection {
    Long getUserIdx();
    String getUserId();
    String getUserName();
    String getUserEmail();
    LocalDate getUserBirth();
    String getUserPhone();
    String getUserTypeName();
    Long getFkUtIdx();
    String getWorkPlaceName();
    Integer getUserIsActive();
    String getUserAccountName();
    String getUserAccountNumber();
    String getUserBank();
    Integer getUserHourlyWage();
    Integer getIsAdmin();
    Long getWorkPlaceIdx();
    java.time.LocalDateTime getUserWithdrawnAt();
    Long getNameSeq();
}
