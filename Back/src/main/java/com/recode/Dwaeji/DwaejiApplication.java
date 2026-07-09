package com.recode.Dwaeji;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class DwaejiApplication {

	public static void main(String[] args) {
		SpringApplication.run(DwaejiApplication.class, args);
	}

}
