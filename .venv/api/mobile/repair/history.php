<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../config/database.php';

session_start();
if (!isset($_SESSION['mobile_user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Не авторизован']);
    exit;
}

$userId = $_SESSION['mobile_user_id'];

// История ремонтов, где текущий пользователь был назначен
$stmt = $pdo->prepare("
    SELECT r.*, e.name as equipment_name, rs.name as status_name
    FROM requests r
    JOIN equipment e ON r.equipment_id = e.id
    JOIN request_status rs ON r.status_id = rs.id
    WHERE r.type = 'breakdown' AND r.assigned_to = ? AND r.status_id = 3
    ORDER BY r.completed_at DESC
");
$stmt->execute([$userId]);
$history = $stmt->fetchAll();

echo json_encode(['success' => true, 'history' => $history]);