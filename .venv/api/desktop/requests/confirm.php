<?php
require_once __DIR__ . '/../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Метод не разрешен'], 405);
}

$user = requireDesktopUser($pdo);
$input = getJsonInput();
$requestId = (int)($input['request_id'] ?? 0);

if ($requestId <= 0) {
    jsonResponse(['success' => false, 'message' => 'Не указан request_id'], 400);
}

$updateStmt = $pdo->prepare("
    UPDATE requests
    SET status_id = 2, assigned_to = ?
    WHERE id = ? AND type = 'material' AND status_id IN (1, 2)
");
$updateStmt->execute([$user['user_id'], $requestId]);

if ($updateStmt->rowCount() === 0) {
    jsonResponse(['success' => false, 'message' => 'Заявка не найдена или недоступна'], 404);
}

createNotification(
    $pdo,
    null,
    'request',
    'Заявка подтверждена',
    'Заявка #' . $requestId . ' подтверждена кладовщиком'
);

jsonResponse(['success' => true]);
