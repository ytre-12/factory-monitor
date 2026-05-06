<?php
require_once __DIR__ . '/../config/bootstrap.php';

requireDesktopUser($pdo);
maybeGenerateSupply($pdo);

$stmt = $pdo->query("
    SELECT id, material_name, unit, quantity, location_code, processed, created_at
    FROM warehouse_supply_events
    WHERE processed = 0
    ORDER BY created_at DESC
    LIMIT 100
");
$supplies = $stmt->fetchAll();

jsonResponse([
    'success' => true,
    'supplies' => $supplies
]);
