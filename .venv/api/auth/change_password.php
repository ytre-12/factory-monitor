<?php
require_once '../config/database.php';

requireAuth();
verifyCsrf();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Метод не разрешен'], 405);
}

$data = getJsonInput();
$oldPassword = (string)($data['old_password'] ?? '');
$newPassword = (string)($data['new_password'] ?? '');

if ($oldPassword === '' || $newPassword === '') {
    jsonResponse(['success' => false, 'message' => 'Все поля обязательны'], 422);
}

if (strlen($newPassword) < 10 || !preg_match('/[A-Z]/', $newPassword) || !preg_match('/[a-z]/', $newPassword) || !preg_match('/\d/', $newPassword)) {
    jsonResponse(['success' => false, 'message' => 'Пароль должен быть не менее 10 символов и содержать буквы разного регистра и цифры'], 422);
}

$stmt = $pdo->prepare("SELECT password_hash FROM employees WHERE id = ?");
$stmt->execute([(int)$_SESSION['user_id']]);
$row = $stmt->fetch();

if (!$row || !password_verify($oldPassword, (string)$row['password_hash'])) {
    auditLog($pdo, (int)$_SESSION['user_id'], 'auth_change_password_failed', 'Wrong old password');
    jsonResponse(['success' => false, 'message' => 'Неверный текущий пароль'], 401);
}

$newHash = password_hash($newPassword, PASSWORD_DEFAULT);
$updateStmt = $pdo->prepare("UPDATE employees SET password_hash = ? WHERE id = ?");
$updateStmt->execute([$newHash, (int)$_SESSION['user_id']]);

auditLog($pdo, (int)$_SESSION['user_id'], 'auth_change_password', 'Password changed');
jsonResponse(['success' => true, 'message' => 'Пароль успешно изменен']);
