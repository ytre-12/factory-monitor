<?php
require_once __DIR__ . '/../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Метод не разрешен'], 405);
}

$user = requireDesktopUser($pdo);
$input = getJsonInput();
$notificationId = isset($input['notification_id']) ? (int)$input['notification_id'] : 0;
$markAll = (bool)($input['mark_all'] ?? false);

if ($markAll) {
    $stmt = $pdo->prepare("
        UPDATE desktop_notifications
        SET is_read = 1
        WHERE (user_id IS NULL OR user_id = ?) AND is_read = 0
    ");
    $stmt->execute([$user['user_id']]);
    jsonResponse(['success' => true, 'updated' => $stmt->rowCount()]);
}

if ($notificationId <= 0) {
    jsonResponse(['success' => false, 'message' => 'Не указан notification_id'], 400);
}

$stmt = $pdo->prepare("
    UPDATE desktop_notifications
    SET is_read = 1
    WHERE id = ? AND (user_id IS NULL OR user_id = ?)
");
$stmt->execute([$notificationId, $user['user_id']]);

jsonResponse(['success' => true, 'updated' => $stmt->rowCount()]);
