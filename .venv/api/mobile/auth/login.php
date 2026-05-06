<?php
require_once __DIR__ . '/../config/mobile_config.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Метод не разрешен'], 405);
}

$data = getJsonInput();
$email = trim((string)($data['email'] ?? ''));
$password = (string)($data['password'] ?? '');

if ($email === '' || $password === '') {
    jsonResponse(['success' => false, 'message' => 'Email и пароль обязательны'], 422);
}

$stmt = $pdo->prepare("
    SELECT e.*, r.name AS role_name
    FROM employees e
    JOIN roles r ON e.role_id = r.id
    WHERE e.email = ? AND e.is_active = 1
    LIMIT 1
");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, (string)$user['password_hash'])) {
    jsonResponse(['success' => false, 'message' => 'Неверный email или пароль'], 401);
}

// Для мобильного приложения без строгой блокировки попыток входа.
session_regenerate_id(true);
$_SESSION['mobile_user_id'] = (int)$user['id'];
$_SESSION['mobile_role'] = (string)$user['role_name'];

echo json_encode([
    'success' => true,
    'token' => bin2hex(random_bytes(32)),
    'user_id' => (int)$user['id'],
    'role' => (string)$user['role_name'],
    'name' => trim((string)$user['first_name'] . ' ' . (string)$user['last_name'])
], JSON_UNESCAPED_UNICODE);
exit;
