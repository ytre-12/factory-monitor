<?php
require_once '../config/database.php';

if (!isAuthenticated()) {
    jsonResponse(['authenticated' => false]);
}

jsonResponse([
    'authenticated' => true,
    'csrf_token' => issueCsrfToken(),
    'user' => [
        'id' => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'],
        'email' => $_SESSION['user_email'],
        'role' => $_SESSION['role']
    ]
]);
