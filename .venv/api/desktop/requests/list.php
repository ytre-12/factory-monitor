<?php
require_once __DIR__ . '/../config/bootstrap.php';

requireDesktopUser($pdo);
maybeGenerateSupply($pdo);

$statusFilter = trim((string)($_GET['status'] ?? 'active'));

$sql = "
    SELECT
        r.id,
        r.type,
        r.description,
        r.status_id,
        r.employee_id,
        r.equipment_id,
        r.created_at,
        r.completed_at,
        e.first_name,
        e.last_name,
        eq.name AS equipment_name,
        rm.material_id,
        rm.quantity_requested,
        m.name AS material_name,
        COALESCE(m.unit, 'шт') AS unit
    FROM requests r
    LEFT JOIN employees e ON e.id = r.employee_id
    LEFT JOIN equipment eq ON eq.id = r.equipment_id
    LEFT JOIN request_materials rm ON rm.request_id = r.id
    LEFT JOIN materials m ON m.id = rm.material_id
    WHERE r.type = 'material'
";

if ($statusFilter === 'active') {
    $sql .= " AND r.status_id IN (1, 2)";
} elseif ($statusFilter === 'done') {
    $sql .= " AND r.status_id = 3";
}

$sql .= " ORDER BY r.created_at DESC LIMIT 300";

$stmt = $pdo->query($sql);
$rows = $stmt->fetchAll();

$requests = [];
foreach ($rows as $row) {
    $id = (int)$row['id'];
    if (!isset($requests[$id])) {
        $requests[$id] = [
            'id' => $id,
            'type' => (string)$row['type'],
            'description' => (string)$row['description'],
            'status_id' => (int)$row['status_id'],
            'employee_id' => (int)$row['employee_id'],
            'employee_name' => trim(((string)$row['first_name']) . ' ' . ((string)$row['last_name'])),
            'equipment_name' => (string)($row['equipment_name'] ?? ''),
            'created_at' => (string)$row['created_at'],
            'completed_at' => (string)($row['completed_at'] ?? ''),
            'materials' => []
        ];
    }

    if (!empty($row['material_name'])) {
        $requests[$id]['materials'][] = [
            'material_id' => (int)$row['material_id'],
            'material_name' => (string)$row['material_name'],
            'quantity_requested' => (float)$row['quantity_requested'],
            'unit' => (string)$row['unit']
        ];
    }
}

jsonResponse([
    'success' => true,
    'requests' => array_values($requests)
]);
