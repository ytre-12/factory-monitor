<?php
require_once __DIR__ . '/../config/bootstrap.php';

$user = requireDesktopUser($pdo);
maybeGenerateSupply($pdo);

$counts = [
    'pending_requests' => 0,
    'confirmed_requests' => 0,
    'low_stock_items' => 0,
    'total_materials' => 0,
    'today_receipts' => 0,
    'today_issues' => 0,
    'today_writeoffs' => 0,
    'unread_notifications' => 0
];

$pendingStmt = $pdo->query("
    SELECT
        SUM(CASE WHEN status_id = 1 THEN 1 ELSE 0 END) AS pending_requests,
        SUM(CASE WHEN status_id = 2 THEN 1 ELSE 0 END) AS confirmed_requests
    FROM requests
    WHERE type = 'material'
");
$pending = $pendingStmt->fetch();
$counts['pending_requests'] = (int)($pending['pending_requests'] ?? 0);
$counts['confirmed_requests'] = (int)($pending['confirmed_requests'] ?? 0);

$stockStmt = $pdo->query("
    SELECT
        COUNT(*) AS total_materials,
        SUM(CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END) AS low_stock_items
    FROM warehouse_stock
");
$stock = $stockStmt->fetch();
$counts['total_materials'] = (int)($stock['total_materials'] ?? 0);
$counts['low_stock_items'] = (int)($stock['low_stock_items'] ?? 0);

$todayOpsStmt = $pdo->query("
    SELECT
        SUM(CASE WHEN operation_type = 'receipt' THEN quantity ELSE 0 END) AS today_receipts,
        SUM(CASE WHEN operation_type = 'issue' THEN quantity ELSE 0 END) AS today_issues,
        SUM(CASE WHEN operation_type = 'writeoff' THEN quantity ELSE 0 END) AS today_writeoffs
    FROM warehouse_operations
    WHERE DATE(created_at) = CURDATE()
");
$todayOps = $todayOpsStmt->fetch();
$counts['today_receipts'] = (float)($todayOps['today_receipts'] ?? 0);
$counts['today_issues'] = (float)($todayOps['today_issues'] ?? 0);
$counts['today_writeoffs'] = (float)($todayOps['today_writeoffs'] ?? 0);

$notificationsCountStmt = $pdo->prepare("
    SELECT COUNT(*) AS unread_count
    FROM desktop_notifications
    WHERE (user_id IS NULL OR user_id = ?) AND is_read = 0
");
$notificationsCountStmt->execute([$user['user_id']]);
$notificationsCount = $notificationsCountStmt->fetch();
$counts['unread_notifications'] = (int)($notificationsCount['unread_count'] ?? 0);

$suppliesStmt = $pdo->query("
    SELECT id, material_name, unit, quantity, location_code, created_at
    FROM warehouse_supply_events
    WHERE processed = 0
    ORDER BY created_at DESC
    LIMIT 20
");
$supplies = $suppliesStmt->fetchAll();

$notificationsStmt = $pdo->prepare("
    SELECT id, kind, title, message, is_read, created_at
    FROM desktop_notifications
    WHERE (user_id IS NULL OR user_id = ?)
    ORDER BY created_at DESC
    LIMIT 30
");
$notificationsStmt->execute([$user['user_id']]);
$notifications = $notificationsStmt->fetchAll();

jsonResponse([
    'success' => true,
    'warehouse_name' => 'Склад на синявенской 11',
    'counts' => $counts,
    'pending_supplies' => $supplies,
    'notifications' => $notifications,
    'user' => $user
]);
