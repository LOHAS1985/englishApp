package com.example.backend.common;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AppStateRepository extends JpaRepository<AppState, String> {
}
