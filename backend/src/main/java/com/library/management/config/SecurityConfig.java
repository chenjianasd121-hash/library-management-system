package com.library.management.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.library.management.common.ApiResponse;
import com.library.management.user.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.csrf.CsrfFilter;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return PasswordEncoderFactories.createDelegatingPasswordEncoder(); }
    @Bean HttpSessionSecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }
    @Bean AuthenticationManager authenticationManager(UserService users, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider=new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder); return new ProviderManager(provider);
    }
    @Bean SecurityFilterChain filterChain(HttpSecurity http, AccountGateFilter gate, ObjectMapper json,
        HttpSessionSecurityContextRepository repository) throws Exception {
        CookieCsrfTokenRepository csrf=CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrf.setCookieName("XSRF-TOKEN"); csrf.setHeaderName("X-XSRF-TOKEN");
        csrf.setCookieCustomizer(cookie -> cookie.sameSite("Lax"));
        http.securityContext(c -> c.securityContextRepository(repository))
          .csrf(c -> c.csrfTokenRepository(csrf).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
          .cors(AbstractHttpConfigurer::disable)
          .authorizeHttpRequests(a -> a
            .requestMatchers("/api/v1/auth/csrf","/api/v1/auth/register","/api/v1/auth/login","/api/v1/policy").permitAll()
            .requestMatchers(org.springframework.http.HttpMethod.GET,"/api/v1/categories","/api/v1/books/**","/api/v1/notices/**","/api/v1/media/covers/**").permitAll()
            .anyRequest().authenticated())
          .exceptionHandling(e -> e
            .authenticationEntryPoint((req,res,ex) -> write(json,res,401,"AUTH_REQUIRED","请先登录"))
            .accessDeniedHandler((req,res,ex) -> write(json,res,403,"FORBIDDEN","无权限或 CSRF 校验失败")))
          .addFilterAfter(gate,CsrfFilter.class);
        return http.build();
    }
    static void write(ObjectMapper json,HttpServletResponse response,int status,String code,String message) throws IOException {
        response.setStatus(status); response.setContentType(MediaType.APPLICATION_JSON_VALUE); response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getWriter(),ApiResponse.error(code,message,List.of()));
    }
}
