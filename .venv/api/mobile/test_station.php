<?php
require_once __DIR__ . '/config/mobile_config.php';

// Временно без авторизации для теста
$userId = 2; // ID оператора

$stmt = $pdo->prepare("
    SELECT e.* 
    FROM equipment e
    WHERE e.assigned_to = ?
");
$stmt->execute([$userId]);
$station = $stmt->fetch();

if (!$station) {
    echo json_encode(['success' => true, 'station' => null]);
    exit;
}

echo json_encode(['success' => true, 'station' => $station]);