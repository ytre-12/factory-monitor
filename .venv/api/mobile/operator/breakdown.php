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
$description = $data['description'] ?? '';

if (empty($description)) {
    echo json_encode(['success' => false, 'message' => 'Опишите проблему']);
    exit;
}

$userId = $_SESSION['mobile_user_id'];

// Получаем станок оператора
$stmt = $pdo->prepare("SELECT id FROM equipment WHERE assigned_to = ?");
$stmt->execute([$userId]);
$station = $stmt->fetch();

if (!$station) {
    echo json_encode(['success' => false, 'message' => 'Станок не найден']);
    exit;
}

$stationId = $station['id'];

// Обновляем статус станка
$updateStmt = $pdo->prepare("UPDATE equipment SET status = 'broken' WHERE id = ?");
$updateStmt->execute([$stationId]);

// Создаём заявку
$requestStmt = $pdo->prepare("
    INSERT INTO requests (type, description, employee_id, equipment_id, status_id)
    VALUES ('breakdown', ?, ?, ?, 1)
");
$requestStmt->execute([$description, $userId, $stationId]);

echo json_encode(['success' => true, 'message' => 'Сообщение о поломке отправлено']);