<?php
require_once __DIR__ . '/../config/bootstrap.php';

$user = requireDesktopUser($pdo);
maybeGenerateSupply($pdo);

$unreadOnly = (string)($_GET['unread_only'] ?? '') === '1';

$sql = "
    SELECT id, kind, title, message, is_read, created_at
    FROM desktop_notifications
    WHERE (user_id IS NULL OR user_id = ?)
";
$params = [$user['user_id']];

if ($unreadOnly) {
    $sql .= " AND is_read = 0";
}

$sql .= " ORDER BY created_at DESC LIMIT 100";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$notifications = $stmt->fetchAll();

jsonResponse([
    'success' => true,
    'notifications' => $notifications
]);
