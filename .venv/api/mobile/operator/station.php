<?php
require_once __DIR__ . '/../config/mobile_config.php';

session_start();

// Диагностика
$response = ['success' => false, 'message' => ''];

if (!isset($_SESSION['mobile_user_id'])) {
    $response['message'] = 'Не авторизован. Нет user_id в сессии';
    jsonResponse($response);
}

$userId = $_SESSION['mobile_user_id'];

// Проверяем, есть ли оператор в БД
$checkUser = $pdo->prepare("SELECT id, email FROM employees WHERE id = ?");
$checkUser->execute([$userId]);
$user = $checkUser->fetch();

if (!$user) {
    $response['message'] = 'Пользователь с ID ' . $userId . ' не найден в БД';
    jsonResponse($response);
}

// Ищем станок, закреплённый за оператором
$stmt = $pdo->prepare("
    SELECT e.* 
    FROM equipment e
    WHERE e.assigned_to = ?
");
$stmt->execute([$userId]);
$station = $stmt->fetch();

if (!$station) {
    $response['message'] = 'Станок не назначен. assigned_to = ' . $userId . ' не найден';
    $response['available_stations'] = $pdo->query("SELECT id, name, assigned_to FROM equipment")->fetchAll();
    jsonResponse($response);
}

jsonResponse(['success' => true, 'station' => $station]);