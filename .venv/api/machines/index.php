<?php
require_once '../config/database.php';

requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '';
$id = null;

if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
    verifyCsrf();
}

if (preg_match('/\/(\d+)/', $path, $matches)) {
    $id = (int)$matches[1];
}

if ($method === 'GET' && !$id) {
    $status = trim((string)($_GET['status'] ?? ''));
    $search = trim((string)($_GET['search'] ?? ''));

    $sql = "
        SELECT e.*, CONCAT(emp.first_name, ' ', emp.last_name) AS assigned_name
        FROM equipment e
        LEFT JOIN employees emp ON e.assigned_to = emp.id
    ";
    $params = [];

    if ($status !== '') {
        $sql .= ' WHERE e.status = ?';
        $params[] = $status;
    }

    if ($search !== '') {
        $where = $status === '' ? ' WHERE' : ' AND';
        $sql .= $where . ' (e.name LIKE ? OR e.type LIKE ?)';
        $like = '%' . $search . '%';
        $params[] = $like;
        $params[] = $like;
    }

    $sql .= ' ORDER BY e.id ASC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['success' => true, 'machines' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $id) {
    $stmt = $pdo->prepare("
        SELECT e.*, CONCAT(emp.first_name, ' ', emp.last_name) AS assigned_name
        FROM equipment e
        LEFT JOIN employees emp ON e.assigned_to = emp.id
        WHERE e.id = ?
    ");
    $stmt->execute([$id]);
    $machine = $stmt->fetch();
    if (!$machine) {
        jsonResponse(['success' => false, 'message' => 'Станок не найден'], 404);
    }
    jsonResponse(['success' => true, 'machine' => $machine]);
}

if ($method === 'GET' && preg_match('/\/(\d+)\/logs/', $path, $matches)) {
    $machineId = (int)$matches[1];
    $stmt = $pdo->prepare("
        SELECT ml.*, CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name
        FROM machine_logs ml
        JOIN employees emp ON ml.employee_id = emp.id
        WHERE ml.equipment_id = ?
        ORDER BY ml.created_at DESC
        LIMIT 100
    ");
    $stmt->execute([$machineId]);
    jsonResponse(['success' => true, 'logs' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $data = getJsonInput();
    $name = trim((string)($data['name'] ?? ''));
    $type = trim((string)($data['type'] ?? ''));
    $status = trim((string)($data['status'] ?? 'idle'));
    $lastMaintenance = $data['last_maintenance'] ?? null;
    $assignedTo = isset($data['assigned_to']) ? (int)$data['assigned_to'] : null;

    if ($name === '') {
        jsonResponse(['success' => false, 'message' => 'Название станка обязательно'], 422);
    }

    $stmt = $pdo->prepare("
        INSERT INTO equipment (name, type, status, last_maintenance, assigned_to)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$name, $type, $status, $lastMaintenance, $assignedTo]);
    $newId = (int)$pdo->lastInsertId();
    auditLog($pdo, (int)$_SESSION['user_id'], 'machine_create', 'machine_id=' . (string)$newId);
    jsonResponse(['success' => true, 'message' => 'Станок создан', 'id' => $newId]);
}

if ($method === 'PUT' && $id) {
    $data = getJsonInput();
    $updates = [];
    $params = [];

    $allowedFields = ['name', 'type', 'status', 'last_maintenance', 'assigned_to'];
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $updates[] = "$field = ?";
            $params[] = $data[$field];
        }
    }

    if (empty($updates)) {
        jsonResponse(['success' => false, 'message' => 'Нет данных для обновления'], 422);
    }

    $params[] = $id;
    $sql = 'UPDATE equipment SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    auditLog($pdo, (int)$_SESSION['user_id'], 'machine_update', 'machine_id=' . (string)$id);
    jsonResponse(['success' => true, 'message' => 'Станок обновлен']);
}

if ($method === 'DELETE' && $id) {
    $stmt = $pdo->prepare('DELETE FROM equipment WHERE id = ?');
    $stmt->execute([$id]);
    auditLog($pdo, (int)$_SESSION['user_id'], 'machine_delete', 'machine_id=' . (string)$id);
    jsonResponse(['success' => true, 'message' => 'Станок удален']);
}

if ($method === 'GET' && $path === '/statuses') {
    jsonResponse(['success' => true, 'statuses' => ['working', 'idle', 'broken', 'maintenance']]);
}

if ($method === 'GET' && $path === '/operators') {
    $stmt = $pdo->prepare("
        SELECT id, CONCAT(first_name, ' ', last_name) AS name
        FROM employees
        WHERE role_id = 2 AND is_active = 1
    ");
    $stmt->execute();
    jsonResponse(['success' => true, 'operators' => $stmt->fetchAll()]);
}

jsonResponse(['success' => false, 'message' => 'Route not found'], 404);
