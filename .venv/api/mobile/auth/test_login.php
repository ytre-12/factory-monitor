<?php
require_once __DIR__ . '/../config/mobile_config.php';

$email = 'Test@test';

$stmt = $pdo->prepare("
    SELECT e.*, r.name as role_name 
    FROM employees e
    JOIN roles r ON e.role_id = r.id
    WHERE e.email = ?
");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    session_start();
    $_SESSION['mobile_user_id'] = $user['id'];
    $_SESSION['mobile_role'] = $user['role_name'];
    
    echo json_encode([
        'success' => true,
        'user_id' => $user['id'],
        'role' => $user['role_name'],
        'name' => $user['first_name'] . ' ' . $user['last_name']
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Пользователь не найден']);
}