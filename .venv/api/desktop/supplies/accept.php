<?php
require_once __DIR__ . '/../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Метод не разрешен'], 405);
}

$user = requireDesktopUser($pdo);
$input = getJsonInput();
$supplyId = (int)($input['supply_id'] ?? 0);

if ($supplyId <= 0) {
    jsonResponse(['success' => false, 'message' => 'Не указан supply_id'], 400);
}

$supplyStmt = $pdo->prepare("
    SELECT id, material_name, unit, quantity, location_code, processed
    FROM warehouse_supply_events
    WHERE id = ?
    LIMIT 1
");
$supplyStmt->execute([$supplyId]);
$supply = $supplyStmt->fetch();

if (!$supply) {
    jsonResponse(['success' => false, 'message' => 'Поставка не найдена'], 404);
}
if ((int)$supply['processed'] === 1) {
    jsonResponse(['success' => false, 'message' => 'Поставка уже принята'], 400);
}

$stockStmt = $pdo->prepare("
    SELECT id, quantity, material_id, material_name, unit, location_code
    FROM warehouse_stock
    WHERE material_name = ?
    LIMIT 1
");
$stockStmt->execute([$supply['material_name']]);
$stock = $stockStmt->fetch();

if (!$stock) {
    $insertStock = $pdo->prepare("
        INSERT INTO warehouse_stock (
            material_id,
            material_name,
            unit,
            quantity,
            min_stock,
            warehouse_name,
            location_code
        )
        VALUES (NULL, ?, ?, ?, 10, 'Склад на синявенской 11', ?)
    ");
    $insertStock->execute([
        $supply['material_name'],
        $supply['unit'],
        $supply['quantity'],
        $supply['location_code']
    ]);
    $stockId = (int)$pdo->lastInsertId();
    $materialId = null;
    $newQuantity = (float)$supply['quantity'];
    $locationCode = (string)$supply['location_code'];
} else {
    $stockId = (int)$stock['id'];
    $materialId = $stock['material_id'] ? (int)$stock['material_id'] : null;
    $newQuantity = (float)$stock['quantity'] + (float)$supply['quantity'];
    $locationCode = (string)$stock['location_code'];

    $updateStock = $pdo->prepare("UPDATE warehouse_stock SET quantity = ? WHERE id = ?");
    $updateStock->execute([$newQuantity, $stockId]);
}

$markSupply = $pdo->prepare("
    UPDATE warehouse_supply_events
    SET processed = 1, processed_at = NOW()
    WHERE id = ?
");
$markSupply->execute([$supplyId]);

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
    )
    VALUES (?, 'receipt', ?, ?, ?, ?, ?, NULL, 'Приемка поставки')
");
$insertOperation->execute([
    $user['user_id'],
    $materialId,
    $supply['material_name'],
    (float)$supply['quantity'],
    $supply['unit'],
    $locationCode
]);

createNotification(
    $pdo,
    null,
    'supply',
    'Поставка принята',
    'Поставка #' . $supplyId . ' принята на склад'
);

jsonResponse([
    'success' => true,
    'new_quantity' => $newQuantity
]);
