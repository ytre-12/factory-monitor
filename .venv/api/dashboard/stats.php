<?php
require_once '../config/database.php';

if (!isAuthenticated()) {
    jsonResponse(['success' => false, 'message' => 'Не авторизован']);
}

// Всего станков
$stmt = $pdo->query("SELECT COUNT(*) as total FROM equipment");
$totalMachines = $stmt->fetch()['total'];

// Сломанных станков
$stmt = $pdo->query("SELECT COUNT(*) as broken FROM equipment WHERE status = 'broken'");
$brokenMachines = $stmt->fetch()['broken'];

// Новых заявок
$stmt = $pdo->query("SELECT COUNT(*) as new FROM requests WHERE status_id = 1");
$newRequests = $stmt->fetch()['new'];

// Выполненных за сегодня
$stmt = $pdo->query("SELECT COUNT(*) as today_done FROM requests WHERE status_id = 3 AND DATE(completed_at) = CURDATE()");
$todayDone = $stmt->fetch()['today_done'];

// График заявок по дням (последние 7 дней)
$stmt = $pdo->query("
    SELECT DATE(created_at) as date, COUNT(*) as count 
    FROM requests 
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
");
$chartRequests = $stmt->fetchAll();

// Статусы станков
$stmt = $pdo->query("
    SELECT status, COUNT(*) as count 
    FROM equipment 
    GROUP BY status
");
$machineStatus = $stmt->fetchAll();

// ТОП-3 причины поломок
$stmt = $pdo->query("
    SELECT description, COUNT(*) as count 
    FROM requests 
    WHERE type = 'breakdown' 
    GROUP BY description 
    ORDER BY count DESC 
    LIMIT 3
");
$topBreakdowns = $stmt->fetchAll();

// Логи за последние 7 дней
$stmt = $pdo->query("
    SELECT DATE(created_at) as date, HOUR(created_at) as hour, COUNT(*) as count
    FROM machine_logs
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at), HOUR(created_at)
");
$heatmap = $stmt->fetchAll();

jsonResponse([
    'success' => true,
    'total_machines' => $totalMachines,
    'broken_machines' => $brokenMachines,
    'new_requests' => $newRequests,
    'today_done' => $todayDone,
    'chart_requests' => $chartRequests,
    'machine_status' => $machineStatus,
    'top_breakdowns' => $topBreakdowns,
    'heatmap' => $heatmap
]);