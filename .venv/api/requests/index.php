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
    $id = $matches[1];
}

if ($method === 'GET' && !$id && $path !== '/statuses' && $path !== '/types' && $path !== '/employees') {
    $type = $_GET['type'] ?? '';
    $status = $_GET['status'] ?? '';
    $search = trim((string)($_GET['search'] ?? ''));
    $sort = $_GET['sort'] ?? 'created_at';
    $order = $_GET['order'] ?? 'DESC';

    $allowedSortFields = ['type', 'employee_name', 'assigned_name', 'equipment_name', 'created_at'];
    if (!in_array($sort, $allowedSortFields, true)) {
        $sort = 'created_at';
    }
    $order = strtoupper((string)$order) === 'ASC' ? 'ASC' : 'DESC';

    $sql = "
        SELECT r.*,
               rs.name AS status_name,
               CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name,
               eq.name AS equipment_name,
               CONCAT(ass.first_name, ' ', ass.last_name) AS assigned_name
        FROM requests r
        JOIN request_status rs ON r.status_id = rs.id
        JOIN employees emp ON r.employee_id = emp.id
        LEFT JOIN equipment eq ON r.equipment_id = eq.id
        LEFT JOIN employees ass ON r.assigned_to = ass.id
        WHERE 1=1
    ";
    $params = [];

    if ($type !== '') {
        $sql .= ' AND r.type = ?';
        $params[] = $type;
    }

    if ($status !== '') {
        if (strpos($status, ',') !== false) {
            $statusIds = array_filter(array_map('trim', explode(',', $status)), static fn($v) => $v !== '');
            if (!empty($statusIds)) {
                $placeholders = implode(',', array_fill(0, count($statusIds), '?'));
                $sql .= " AND r.status_id IN ($placeholders)";
                foreach ($statusIds as $sid) {
                    $params[] = (int)$sid;
                }
            }
        } else {
            $sql .= ' AND r.status_id = ?';
            $params[] = (int)$status;
        }
    }

    if ($search !== '') {
        $sql .= ' AND (r.description LIKE ? OR eq.name LIKE ?)';
        $like = '%' . $search . '%';
        $params[] = $like;
        $params[] = $like;
    }

    $sql .= " ORDER BY $sort $order";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['success' => true, 'requests' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $id) {
    $stmt = $pdo->prepare("
        SELECT r.*,
               rs.name AS status_name,
               CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name,
               eq.name AS equipment_name,
               CONCAT(ass.first_name, ' ', ass.last_name) AS assigned_name
        FROM requests r
        JOIN request_status rs ON r.status_id = rs.id
        JOIN employees emp ON r.employee_id = emp.id
        LEFT JOIN equipment eq ON r.equipment_id = eq.id
        LEFT JOIN employees ass ON r.assigned_to = ass.id
        WHERE r.id = ?
    ");
    $stmt->execute([(int)$id]);
    $request = $stmt->fetch();
    if (!$request) {
        jsonResponse(['success' => false, 'message' => 'Заявка не найдена'], 404);
    }
    jsonResponse(['success' => true, 'request' => $request]);
}

if ($method === 'POST') {
    $data = getJsonInput();
    $type = trim((string)($data['type'] ?? ''));
    $description = trim((string)($data['description'] ?? ''));
    $employeeId = isset($data['employee_id']) ? (int)$data['employee_id'] : null;
    $equipmentId = isset($data['equipment_id']) ? (int)$data['equipment_id'] : null;
    $statusId = isset($data['status_id']) ? (int)$data['status_id'] : 1;

    if ($type === '' || $description === '') {
        jsonResponse(['success' => false, 'message' => 'Тип и описание заявки обязательны'], 422);
    }
    if (mb_strlen($description) > 2000) {
        jsonResponse(['success' => false, 'message' => 'Описание слишком длинное'], 422);
    }

    $stmt = $pdo->prepare('
        INSERT INTO requests (type, description, employee_id, equipment_id, status_id)
        VALUES (?, ?, ?, ?, ?)
    ');
    $stmt->execute([$type, $description, $employeeId, $equipmentId, $statusId]);
    $newId = (int)$pdo->lastInsertId();
    auditLog($pdo, (int)$_SESSION['user_id'], 'request_create', 'request_id=' . (string)$newId);

    jsonResponse(['success' => true, 'message' => 'Заявка создана', 'id' => $newId]);
}

if ($method === 'PUT' && $id) {
    $data = getJsonInput();
    $updates = [];
    $params = [];

    if (array_key_exists('description', $data)) {
        $description = trim((string)$data['description']);
        if ($description === '' || mb_strlen($description) > 2000) {
            jsonResponse(['success' => false, 'message' => 'Некорректное описание'], 422);
        }
        $updates[] = 'description = ?';
        $params[] = $description;
    }
    if (array_key_exists('status_id', $data)) {
        $updates[] = 'status_id = ?';
        $params[] = (int)$data['status_id'];
    }
    if (array_key_exists('assigned_to', $data)) {
        $updates[] = 'assigned_to = ?';
        $params[] = $data['assigned_to'] !== null ? (int)$data['assigned_to'] : null;
    }
    if (array_key_exists('completed_at', $data)) {
        $updates[] = 'completed_at = ?';
        $params[] = $data['completed_at'] ?: null;
    }

    if (empty($updates)) {
        jsonResponse(['success' => false, 'message' => 'Нет данных для обновления'], 422);
    }

    $params[] = (int)$id;
    $sql = 'UPDATE requests SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    auditLog($pdo, (int)$_SESSION['user_id'], 'request_update', 'request_id=' . (string)$id);

    jsonResponse(['success' => true, 'message' => 'Заявка обновлена']);
}

if ($method === 'DELETE' && $id) {
    $stmt = $pdo->prepare('DELETE FROM requests WHERE id = ?');
    $stmt->execute([(int)$id]);
    auditLog($pdo, (int)$_SESSION['user_id'], 'request_delete', 'request_id=' . (string)$id);
    jsonResponse(['success' => true, 'message' => 'Заявка удалена']);
}

if ($method === 'GET' && $path === '/statuses') {
    $stmt = $pdo->query('SELECT * FROM request_status');
    jsonResponse(['success' => true, 'statuses' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $path === '/types') {
    jsonResponse(['success' => true, 'types' => ['start', 'stop', 'breakdown', 'material', 'update', 'repair_approval']]);
}

if ($method === 'GET' && $path === '/employees') {
    $stmt = $pdo->prepare("
        SELECT id, CONCAT(first_name, ' ', last_name) AS name
        FROM employees
        WHERE is_active = 1
    ");
    $stmt->execute();
    jsonResponse(['success' => true, 'employees' => $stmt->fetchAll()]);
}

jsonResponse(['success' => false, 'message' => 'Route not found'], 404);
