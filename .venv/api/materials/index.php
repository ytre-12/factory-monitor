<?php
require_once '../config/database.php';

requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '';
$id = null;

if (preg_match('/\/(\d+)/', $path, $matches)) {
    $id = (int)$matches[1];
}

if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
    verifyCsrf();
}

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM materials ORDER BY name ASC');
    jsonResponse(['success' => true, 'materials' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $data = getJsonInput();
    $name = trim((string)($data['name'] ?? ''));
    $unit = trim((string)($data['unit'] ?? ''));
    $description = trim((string)($data['description'] ?? ''));
    $minStock = isset($data['min_stock']) ? (float)$data['min_stock'] : 0;

    if ($name === '' || $unit === '') {
        jsonResponse(['success' => false, 'message' => 'Название и единица измерения обязательны'], 422);
    }

    $stmt = $pdo->prepare('
        INSERT INTO materials (name, unit, description, min_stock)
        VALUES (?, ?, ?, ?)
    ');
    $stmt->execute([$name, $unit, $description, $minStock]);
    $newId = (int)$pdo->lastInsertId();
    auditLog($pdo, (int)$_SESSION['user_id'], 'material_create', 'material_id=' . (string)$newId);

    jsonResponse(['success' => true, 'message' => 'Материал создан', 'id' => $newId]);
}

if ($method === 'PUT') {
    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID не указан'], 422);
    }

    $data = getJsonInput();
    $name = trim((string)($data['name'] ?? ''));
    $unit = trim((string)($data['unit'] ?? ''));
    $description = trim((string)($data['description'] ?? ''));
    $minStock = isset($data['min_stock']) ? (float)$data['min_stock'] : 0;

    if ($name === '' || $unit === '') {
        jsonResponse(['success' => false, 'message' => 'Название и единица измерения обязательны'], 422);
    }

    $stmt = $pdo->prepare('
        UPDATE materials
        SET name = ?, unit = ?, description = ?, min_stock = ?
        WHERE id = ?
    ');
    $stmt->execute([$name, $unit, $description, $minStock, $id]);
    auditLog($pdo, (int)$_SESSION['user_id'], 'material_update', 'material_id=' . (string)$id);
    jsonResponse(['success' => true, 'message' => 'Материал обновлен']);
}

if ($method === 'DELETE') {
    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID не указан'], 422);
    }

    $stmt = $pdo->prepare('DELETE FROM materials WHERE id = ?');
    $stmt->execute([$id]);
    auditLog($pdo, (int)$_SESSION['user_id'], 'material_delete', 'material_id=' . (string)$id);
    jsonResponse(['success' => true, 'message' => 'Материал удален']);
}

jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
