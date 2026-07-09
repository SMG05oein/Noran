package com.recode.Dwaeji.user.service;

import com.recode.Dwaeji.user.database.User;
import com.recode.Dwaeji.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // JwtFilter passes email to loadUserByUsername
        // We need to check if the string is email or userId. Let's use userId for loadUserByUsername for standard login,
        // but wait, JwtFilter currently calls loadUserByUsername(email).
        // I will check userId first, then email.
        User user = userRepository.findByUserId(username)
                .orElseGet(() -> userRepository.findByUserEmail(username)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found with username or email: " + username)));

        return new CustomUserDetails(user);
    }
}
