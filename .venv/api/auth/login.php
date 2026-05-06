<?php
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Метод не разрешен'], 405);
}

$data = getJsonInput();
$email = trim((string)($data['email'] ?? ''));
$password = (string)($data['password'] ?? '');
$ip = getClientIp();

if ($email === '' || $password === '') {
    jsonResponse(['success' => false, 'message' => 'Email и пароль обязательны'], 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    recordLoginAttempt($pdo, $email, $ip, false);
    jsonResponse(['success' => false, 'message' => 'Неверный формат email'], 422);
}

if (!checkRateLimit($pdo, $email, $ip, 7, 10)) {
    auditLog($pdo, null, 'auth_rate_limited', 'Too many login attempts for ' . $email);
    jsonResponse(['success' => false, 'message' => 'Слишком много попыток входа. Подождите 10 минут'], 429);
}

$stmt = $pdo->prepare("
    SELECT e.id, e.email, e.first_name, e.last_name, e.password_hash, e.is_active, r.name AS role_name
    FROM employees e
    JOIN roles r ON e.role_id = r.id
    WHERE e.email = ?
    LIMIT 1
");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || (int)$user['is_active'] !== 1 || $user['role_name'] !== 'admin' || !password_verify($password, (string)$user['password_hash'])) {
    recordLoginAttempt($pdo, $email, $ip, false);
    auditLog($pdo, null, 'auth_failed', 'Failed login for email ' . $email);
    jsonResponse(['success' => false, 'message' => 'Неверный email или пароль'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['user_email'] = (string)$user['email'];
$_SESSION['user_name'] = trim((string)$user['first_name'] . ' ' . (string)$user['last_name']);
$_SESSION['role'] = (string)$user['role_name'];
$csrfToken = issueCsrfToken();

recordLoginAttempt($pdo, $email, $ip, true);
auditLog($pdo, (int)$user['id'], 'auth_login', 'Successful admin login');

jsonResponse([
    'success' => true,
    'csrf_token' => $csrfToken,
    'user' => [
        'id' => (int)$user['id'],
        'name' => $_SESSION['user_name'],
        'email' => $_SESSION['user_email'],
        'role' => $_SESSION['role']
    ]
]);
