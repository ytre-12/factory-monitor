<?php
require_once '../config/database.php';

requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '';
$id = null;
if (preg_match('/\/(\d+)/', $path, $matches)) {
    $id = (int)$matches[1];
}

if ($method !== 'GET') {
    verifyCsrf();
}

function isAdminUser(PDO $pdo, int $userId): bool {
    $stmt = $pdo->prepare("
        SELECT 1
        FROM employees e
        JOIN roles r ON e.role_id = r.id
        WHERE e.id = ? AND r.name = 'admin'
        LIMIT 1
    ");
    $stmt->execute([$userId]);
    return (bool)$stmt->fetch();
}

if ($method === 'GET' && !$id && $path !== '/roles') {
    $roleFilter = trim((string)($_GET['role'] ?? ''));
    $search = trim((string)($_GET['search'] ?? ''));

    $sql = "SELECT e.*, r.name as role_name FROM employees e JOIN roles r ON e.role_id = r.id WHERE r.name != 'admin'";
    $params = [];

    if ($roleFilter !== '') {
        $sql .= " AND r.name = ?";
        $params[] = $roleFilter;
    }

    if ($search !== '') {
        $sql .= " AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ?)";
        $like = '%' . $search . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $sql .= " ORDER BY e.created_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();
    foreach ($users as &$user) {
        unset($user['password_hash']);
    }
    unset($user);
    jsonResponse(['success' => true, 'users' => $users]);
}

if ($method === 'GET' && $id) {
    $stmt = $pdo->prepare("
        SELECT e.*, r.name as role_name
        FROM employees e
        JOIN roles r ON e.role_id = r.id
        WHERE e.id = ? AND r.name != 'admin'
        LIMIT 1
    ");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Пользователь не найден'], 404);
    }
    unset($user['password_hash']);
    jsonResponse(['success' => true, 'user' => $user]);
}

if ($method === 'POST' && $path === '/roles') {
    jsonResponse(['success' => false, 'message' => 'Метод не разрешен'], 405);
}

if ($method === 'GET' && $path === '/roles') {
    $stmt = $pdo->query("SELECT * FROM roles WHERE name != 'admin'");
    jsonResponse(['success' => true, 'roles' => $stmt->fetchAll()]);
}

if ($method === 'POST' && !$id) {
    $data = getJsonInput();
    $email = trim((string)($data['email'] ?? ''));
    $lastName = trim((string)($data['last_name'] ?? ''));
    $firstName = trim((string)($data['first_name'] ?? ''));
    $phone = trim((string)($data['phone'] ?? ''));
    $roleId = (int)($data['role_id'] ?? 0);
    $password = (string)($data['password'] ?? 'Admin123!');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $lastName === '' || $firstName === '' || $roleId <= 0) {
        jsonResponse(['success' => false, 'message' => 'Заполните обязательные поля корректно'], 422);
    }

    $checkStmt = $pdo->prepare("SELECT id FROM employees WHERE email = ?");
    $checkStmt->execute([$email]);
    if ($checkStmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Пользователь с таким email уже существует'], 409);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("
        INSERT INTO employees (email, last_name, first_name, phone, password_hash, role_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$email, $lastName, $firstName, $phone, $passwordHash, $roleId]);

    auditLog($pdo, (int)$_SESSION['user_id'], 'users_create', 'Created employee ' . $email);
    jsonResponse(['success' => true, 'message' => 'Пользователь создан', 'id' => (int)$pdo->lastInsertId()]);
}

if ($method === 'PUT' && $id) {
    if (isAdminUser($pdo, $id)) {
        auditLog($pdo, (int)$_SESSION['user_id'], 'users_update_blocked_admin', 'Attempt to update admin id ' . $id);
        jsonResponse(['success' => false, 'message' => 'Администратор защищен от изменения через API'], 403);
    }

    $data = getJsonInput();
    $updates = [];
    $params = [];
    $allowedFields = ['last_name', 'first_name', 'patronymic', 'phone', 'address', 'role_id', 'is_active'];

    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $updates[] = $field . ' = ?';
            $params[] = $data[$field];
        }
    }

    if (!$updates) {
        jsonResponse(['success' => false, 'message' => 'Нет данных для обновления'], 422);
    }

    $params[] = $id;
    $stmt = $pdo->prepare("UPDATE employees SET " . implode(', ', $updates) . " WHERE id = ?");
    $stmt->execute($params);

    auditLog($pdo, (int)$_SESSION['user_id'], 'users_update', 'Updated employee id ' . $id);
    jsonResponse(['success' => true, 'message' => 'Пользователь обновлен']);
}

if ($method === 'DELETE' && $id) {
    if (isAdminUser($pdo, $id)) {
        auditLog($pdo, (int)$_SESSION['user_id'], 'users_delete_blocked_admin', 'Attempt to delete admin id ' . $id);
        jsonResponse(['success' => false, 'message' => 'Администратор защищен от удаления'], 403);
    }

    $stmt = $pdo->prepare("DELETE FROM employees WHERE id = ?");
    $stmt->execute([$id]);
    auditLog($pdo, (int)$_SESSION['user_id'], 'users_delete', 'Deleted employee id ' . $id);
    jsonResponse(['success' => true, 'message' => 'Пользователь удален']);
}

if ($method === 'POST' && preg_match('/\/(\d+)\/reset-password/', $path, $matches)) {
    $targetId = (int)$matches[1];
    if (isAdminUser($pdo, $targetId)) {
        auditLog($pdo, (int)$_SESSION['user_id'], 'users_reset_password_blocked_admin', 'Attempt to reset admin password id ' . $targetId);
        jsonResponse(['success' => false, 'message' => 'Сброс пароля администратора через API запрещен'], 403);
    }

    $newPassword = 'Admin123!';
    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE employees SET password_hash = ? WHERE id = ?");
    $stmt->execute([$newHash, $targetId]);
    auditLog($pdo, (int)$_SESSION['user_id'], 'users_reset_password', 'Reset password for employee id ' . $targetId);
    jsonResponse(['success' => true, 'message' => 'Пароль сброшен на Admin123!']);
}

jsonResponse(['success' => false, 'message' => 'Маршрут не найден'], 404);
