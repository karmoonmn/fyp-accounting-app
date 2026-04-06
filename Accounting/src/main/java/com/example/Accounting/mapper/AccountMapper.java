package com.example.Accounting.mapper;

import com.example.Accounting.model.Account;
import com.example.Accounting.request.AccountReq;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AccountMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "accountCode", ignore = true)
    @Mapping(target = "parent", ignore = true)
    Account toEntity(AccountReq req);
}
