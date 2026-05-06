<?php
require_once __DIR__ . '/../config/bootstrap.php';

$user = requireDesktopUser($pdo);

jsonResponse([
    'success' => true,
    'user' => $user
]);
