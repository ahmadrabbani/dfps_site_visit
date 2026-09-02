-- Generated locally: php scripts/gen-password-hash.php
-- User: Muhammad Umar Zaigham (users.id = 703)
-- CNIC login: 3520286089415
-- Email: umarzaigham@yahoo.com
--
-- Plain password (16 chars): LdaOfficer@2026!
-- VERIFY=OK (tested locally with password_verify)

UPDATE users
SET password = '$2y$10$kww.N1Q7UByFXJSB6IECie2ojBLi92/RncNeOP75UMI5bfvBB3k3y',
    updated_at = NOW()
WHERE id = 703;

-- After running, confirm hash saved correctly (must be 60):
-- SELECT id, name, cnic, email, password, LENGTH(password) AS hash_len, active
-- FROM users WHERE id = 703;

-- Login (web portal — CNIC, not email):
--   CNIC:     3520286089415
--   Password: LdaOfficer@2026!
--
-- NOTE: React Native app uses housingSurveyCommercial/login.php with USERNAME,
-- not this users/CNIC table. For mobile app, reset tbllogin officer account instead.
