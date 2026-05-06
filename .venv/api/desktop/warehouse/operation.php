<?php
require_once __DIR__ . '/../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Метод не разрешен'], 405);
}

$user = requireDesktopUser($pdo);
$input = getJsonInput();

$materialId = (int)($input['material_id'] ?? 0);
$operationType = trim((string)($input['operation_type'] ?? ''));
$quantity = (float)($input['quantity'] ?? 0);
$comment = trim((string)($input['comment'] ?? ''));
$requestId = isset($input['request_id']) ? (int)$input['request_id'] : null;

if ($materialId <= 0 || $quantity <= 0) {
    jsonResponse(['success' => false, 'message' => 'Некорректный материал или количество'], 400);
}

if (!in_array($operationType, ['issue', 'writeoff', 'receipt'], true)) {
    jsonResponse(['success' => false, 'message' => 'Некорректный тип операции'], 400);
}

$materialStmt = $pdo->prepare("
    SELECT id, material_id, material_name, unit, quantity, location_code
    FROM warehouse_stock
    WHERE id = ?
    LIMIT 1
");
$materialStmt->execute([$materialId]);
$material = $materialStmt->fetch();

if (!$material) {
    jsonResponse(['success' => false, 'message' => 'Материал не найден'], 404);
}

$currentQuantity = (float)$material['quantity'];
$nextQuantity = $currentQuantity;
if ($operationType === 'receipt') {
    $nextQuantity += $quantity;
} else {
    $nextQuantity -= $quantity;
}

if ($nextQuantity < 0) {
    jsonResponse(['success' => false, 'message' => 'Недостаточно остатка на складе'], 400);
}

$updateStmt = $pdo->prepare("UPDATE warehouse_stock SET quantity = ? WHERE id = ?");
$updateStmt->execute([$nextQuantity, $materialId]);

$insertOperation = $pdo->prepare("
    INSERT INTO warehouse_operations (
        employee_id,
        operation_type,
        material_id,
        material_name,
        quantity,
        unit,
        location_code,
        request_id,
        comment_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
");
$insertOperation->execute([
    $user['user_id'],
    $operationType,
    $material['material_id'],
    $material['material_name'],
    $quantity,
    $material['unit'],
    $material['location_code'],
    $requestId,
    $comment
]);

if ($requestId && $operationType === 'issue') {
    $requestUpdateStmt = $pdo->prepare("
        UPDATE requests
        SET status_id = 3, completed_at = NOW()
        WHERE id = ? AND type = 'material'
    ");
    $requestUpdateStmt->execute([$requestId]);
}

createNotification(
    $pdo,
    null,
    'operation',
    'Складская операция',
    'Выполнена операция ' . $operationType . ' по материалу ' . $material['material_name'] . ' (' . $quantity . ' ' . $material['unit'] . ')'
);

jsonResponse([
    'success' => true,
    'new_quantity' => $nextQuantity
]);
