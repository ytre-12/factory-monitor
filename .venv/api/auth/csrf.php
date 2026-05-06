<?php
require_once '../config/database.php';

requireAuth();

jsonResponse([
    'success' => true,
    'csrf_token' => issueCsrfToken()
]);
