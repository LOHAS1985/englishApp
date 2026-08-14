package com.example.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path gen = Path.of("static", "audio", "generated");
        String location = gen.toAbsolutePath().toUri().toString();
        registry.addResourceHandler("/audio/generated/**")
                .addResourceLocations(location)
                .setCachePeriod(3600);
    }
}
