<?php
require_once __DIR__ . '/../config/bootstrap.php';

requireDesktopUser($pdo);
maybeGenerateSupply($pdo);

$search = trim((string)($_GET['search'] ?? ''));
$onlyLow = (string)($_GET['only_low'] ?? '') === '1';

$sql = "
    SELECT
        id,
        material_id,
        material_name,
        unit,
        quantity,
        min_stock,
        warehouse_name,
        location_code,
        updated_at,
        CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END AS is_low
    FROM warehouse_stock
    WHERE 1=1
";

$params = [];
if ($search !== '') {
    $sql .= " AND (material_name LIKE ? OR location_code LIKE ?)";
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
}

if ($onlyLow) {
    $sql .= " AND quantity <= min_stock";
}

$sql .= " ORDER BY material_name ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$materials = $stmt->fetchAll();

jsonResponse([
    'success' => true,
    'materials' => $materials
]);
