package com.library.management.config.demo;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component @Profile("demo")
public class DemoDataRunner implements ApplicationRunner {
    private final DemoDataService service;
    public DemoDataRunner(DemoDataService service) { this.service=service; }
    @Override public void run(ApplicationArguments args) { service.seed(); }
}
