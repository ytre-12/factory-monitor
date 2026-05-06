<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../config/database.php';

session_start();
if (!isset($_SESSION['mobile_user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Не авторизован']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$materialId = isset($data['material_id']) ? (int)$data['material_id'] : 0;
$quantity = isset($data['quantity']) ? (int)$data['quantity'] : 0;

if ($materialId <= 0 || $quantity <= 0) {
    echo json_encode(['success' => false, 'message' => 'Выберите материал и количество']);
    exit;
}

$userId = (int)$_SESSION['mobile_user_id'];

$stationStmt = $pdo->prepare("SELECT id FROM equipment WHERE assigned_to = ?");
$stationStmt->execute([$userId]);
$station = $stationStmt->fetch();

if (!$station) {
    echo json_encode(['success' => false, 'message' => 'Станок не найден']);
    exit;
}

$materialNameStmt = $pdo->prepare("SELECT name FROM materials WHERE id = ?");
$materialNameStmt->execute([$materialId]);
$material = $materialNameStmt->fetch();

if (!$material) {
    echo json_encode(['success' => false, 'message' => 'Материал не найден']);
    exit;
}

$stationId = (int)$station['id'];
$description = 'Заявка на материалы: ' . $material['name'];

$requestStmt = $pdo->prepare("
    INSERT INTO requests (type, description, employee_id, equipment_id, status_id)
    VALUES ('material', ?, ?, ?, 1)
");
$requestStmt->execute([$description, $userId, $stationId]);
$requestId = (int)$pdo->lastInsertId();

$requestMaterialStmt = $pdo->prepare("
    INSERT INTO request_materials (request_id, material_id, quantity_requested)
    VALUES (?, ?, ?)
");
$requestMaterialStmt->execute([$requestId, $materialId, $quantity]);

echo json_encode(['success' => true, 'message' => 'Заявка на материалы отправлена']);
