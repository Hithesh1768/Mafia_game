package com.mafia.mafiagame;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import javax.sql.DataSource;

@SpringBootApplication
public class MafiaGameApplication {

    public static void main(String[] args) {
        SpringApplication.run(MafiaGameApplication.class, args);
    }

    @Bean
    public CommandLineRunner migrateDatabase(DataSource dataSource) {
        return args -> {
            try (java.sql.Connection conn = dataSource.getConnection();
                 java.sql.Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE user MODIFY COLUMN role VARCHAR(50)");
            } catch (Exception e) {
                System.out.println("Database migration warning: " + e.getMessage());
            }
        };
    }
}
