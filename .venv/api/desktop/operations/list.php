<?php
require_once __DIR__ . '/../config/bootstrap.php';

requireDesktopUser($pdo);

$limit = (int)($_GET['limit'] ?? 200);
if ($limit <= 0 || $limit > 500) {
    $limit = 200;
}

$type = trim((string)($_GET['type'] ?? ''));
$fromDate = trim((string)($_GET['from_date'] ?? ''));
$toDate = trim((string)($_GET['to_date'] ?? ''));

$sql = "
    SELECT
        o.id,
        o.employee_id,
        o.operation_type,
        o.material_id,
        o.material_name,
        o.quantity,
        o.unit,
        o.location_code,
        o.request_id,
        o.comment_text,
        o.created_at,
        e.first_name,
        e.last_name
    FROM warehouse_operations o
    LEFT JOIN employees e ON e.id = o.employee_id
    WHERE 1=1
";
$params = [];

if ($type !== '' && in_array($type, ['receipt', 'issue', 'writeoff'], true)) {
    $sql .= " AND o.operation_type = ?";
    $params[] = $type;
}

if ($fromDate !== '') {
    $sql .= " AND DATE(o.created_at) >= ?";
    $params[] = $fromDate;
}

if ($toDate !== '') {
    $sql .= " AND DATE(o.created_at) <= ?";
    $params[] = $toDate;
}

$sql .= " ORDER BY o.created_at DESC LIMIT " . $limit;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$operations = $stmt->fetchAll();

foreach ($operations as &$operation) {
    $operation['employee_name'] = trim(((string)$operation['first_name']) . ' ' . ((string)$operation['last_name']));
}
unset($operation);

jsonResponse([
    'success' => true,
    'operations' => $operations
]);
