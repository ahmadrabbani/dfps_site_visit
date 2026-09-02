<?php
$plain = 'LdaOfficer@2026!'; // exactly 16 characters
$hash = password_hash($plain, PASSWORD_BCRYPT, ['cost' => 10]);
$ok = password_verify($plain, $hash) ? 'OK' : 'FAIL';

echo "PLAIN={$plain}\n";
echo "PLAIN_LEN=" . strlen($plain) . "\n";
echo "HASH={$hash}\n";
echo "HASH_LEN=" . strlen($hash) . "\n";
echo "VERIFY={$ok}\n";
