<?php
require_once __DIR__ . '/../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Метод не разрешен'], 405);
}

$input = getJsonInput();
$email = trim((string)($input['email'] ?? ''));
$password = (string)($input['password'] ?? '');

if ($email === '' || $password === '') {
    jsonResponse(['success' => false, 'message' => 'Введите email и пароль'], 400);
}

$stmt = $pdo->prepare("
    SELECT e.id, e.email, e.first_name, e.last_name, e.password_hash, e.is_active, r.name AS role_name
    FROM employees e
    JOIN roles r ON r.id = e.role_id
    WHERE e.email = ?
    LIMIT 1
");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || (int)$user['is_active'] !== 1 || !password_verify($password, (string)$user['password_hash'])) {
    jsonResponse(['success' => false, 'message' => 'Неверный email или пароль'], 401);
}

$allowedRoles = ['кладовщик', 'warehouse', 'warehouse_worker', 'storekeeper', 'склад', 'кладовщик склада'];
$roleName = (string)$user['role_name'];
$role = function_exists('mb_strtolower') ? mb_strtolower($roleName, 'UTF-8') : strtolower($roleName);
if (!in_array($role, $allowedRoles, true)) {
    jsonResponse(['success' => false, 'message' => 'Нет доступа к desktop приложению склада'], 403);
}

$token = bin2hex(random_bytes(32));

$insertSession = $pdo->prepare("
    INSERT INTO desktop_sessions (token, user_id, role_name, expires_at, last_seen_at)
    VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), NOW())
");
$insertSession->execute([$token, (int)$user['id'], (string)$user['role_name']]);

createNotification(
    $pdo,
    (int)$user['id'],
    'auth',
    'Вход в desktop',
    'Пользователь вошел в desktop приложение'
);

jsonResponse([
    'success' => true,
    'token' => $token,
    'user' => [
        'id' => (int)$user['id'],
        'email' => (string)$user['email'],
        'full_name' => trim((string)$user['first_name'] . ' ' . (string)$user['last_name']),
        'role' => (string)$user['role_name']
    ]
]);
