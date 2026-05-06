<?php
require_once 'config/database.php';

$email = 'admin@factory.com';
$password = 'Admin123!';

$stmt = $pdo->prepare("SELECT * FROM employees WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    echo "Пользователь найден\n";
    echo "Хеш в БД: " . $user['password_hash'] . "\n";
    
    if (password_verify($password, $user['password_hash'])) {
        echo "✅ Пароль правильный!\n";
    } else {
        echo "❌ Пароль неправильный\n";
        
        // Сбросить пароль
        $newHash = password_hash('Admin123!', PASSWORD_DEFAULT);
        $update = $pdo->prepare("UPDATE employees SET password_hash = ? WHERE id = ?");
        $update->execute([$newHash, $user['id']]);
        echo "Пароль сброшен. Попробуйте снова.\n";
    }
} else {
    echo "Пользователь не найден\n";
}