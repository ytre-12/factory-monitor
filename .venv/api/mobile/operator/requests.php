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

$stmt = $pdo->prepare("
    SELECT r.*, rs.name as status_name
    FROM requests r
    JOIN request_status rs ON r.status_id = rs.id
    WHERE r.employee_id = ?
    ORDER BY r.created_at DESC
");
$stmt->execute([$userId]);
$requests = $stmt->fetchAll();

echo json_encode(['success' => true, 'requests' => $requests]);