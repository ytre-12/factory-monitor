<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../config/database.php';

session_start();
if (!isset($_SESSION['mobile_user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Не авторизован']);
    exit;
}

$requestId = 0;

if (isset($_GET['id'])) {
    $requestId = (int)$_GET['id'];
}

if ($requestId <= 0 && isset($_SERVER['PATH_INFO'])) {
    $path = trim($_SERVER['PATH_INFO'], '/');
    if (ctype_digit($path)) {
        $requestId = (int)$path;
    }
}

if ($requestId <= 0) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (is_array($data) && isset($data['request_id'])) {
        $requestId = (int)$data['request_id'];
    }
}

if ($requestId <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID заявки не указан']);
    exit;
}

$requestStmt = $pdo->prepare("SELECT equipment_id FROM requests WHERE id = ? AND type = 'breakdown'");
$requestStmt->execute([$requestId]);
$request = $requestStmt->fetch();

if (!$request) {
    echo json_encode(['success' => false, 'message' => 'Заявка не найдена']);
    exit;
}

$equipmentId = (int)$request['equipment_id'];

$equipmentStmt = $pdo->prepare("UPDATE equipment SET status = 'working' WHERE id = ?");
$equipmentStmt->execute([$equipmentId]);

$closeStmt = $pdo->prepare("
    UPDATE requests
    SET status_id = 3, completed_at = NOW()
    WHERE id = ?
");
$closeStmt->execute([$requestId]);

echo json_encode(['success' => true, 'message' => 'Ремонт завершён']);
