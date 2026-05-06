<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config/database.php';

function getDesktopToken(): string {
    $headerToken = $_SERVER['HTTP_X_DESKTOP_TOKEN'] ?? '';
    return is_string($headerToken) ? trim($headerToken) : '';
}

function ensureDesktopSchema(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS desktop_meta (
            meta_key VARCHAR(100) PRIMARY KEY,
            meta_value VARCHAR(255) NOT NULL
        )
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS desktop_sessions (
            token VARCHAR(128) PRIMARY KEY,
            user_id INT NOT NULL,
            role_name VARCHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            last_seen_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_desktop_sessions_user_id (user_id),
            INDEX idx_desktop_sessions_expires_at (expires_at)
        )
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS warehouse_stock (
            id INT AUTO_INCREMENT PRIMARY KEY,
            material_id INT NULL,
            material_name VARCHAR(255) NOT NULL,
            unit VARCHAR(50) NOT NULL DEFAULT 'шт',
            quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
            min_stock DECIMAL(12,2) NOT NULL DEFAULT 10,
            warehouse_name VARCHAR(255) NOT NULL DEFAULT 'Склад на синявенской 11',
            location_code VARCHAR(20) NOT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_warehouse_stock_material_name (material_name),
            INDEX idx_warehouse_stock_material_id (material_id)
        )
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS warehouse_operations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            operation_type ENUM('receipt', 'issue', 'writeoff') NOT NULL,
            material_id INT NULL,
            material_name VARCHAR(255) NOT NULL,
            quantity DECIMAL(12,2) NOT NULL,
            unit VARCHAR(50) NOT NULL DEFAULT 'шт',
            location_code VARCHAR(20) NOT NULL,
            request_id INT NULL,
            comment_text VARCHAR(255) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_warehouse_operations_employee_id (employee_id),
            INDEX idx_warehouse_operations_created_at (created_at),
            INDEX idx_warehouse_operations_request_id (request_id)
        )
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS warehouse_supply_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            material_name VARCHAR(255) NOT NULL,
            unit VARCHAR(50) NOT NULL DEFAULT 'шт',
            quantity DECIMAL(12,2) NOT NULL,
            location_code VARCHAR(20) NOT NULL,
            processed TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME NULL,
            INDEX idx_warehouse_supply_events_processed (processed),
            INDEX idx_warehouse_supply_events_created_at (created_at)
        )
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS desktop_notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            kind VARCHAR(40) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message VARCHAR(500) NOT NULL,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_desktop_notifications_user_id (user_id),
            INDEX idx_desktop_notifications_created_at (created_at),
            INDEX idx_desktop_notifications_is_read (is_read)
        )
    ");
}

function seedWarehouseStock(PDO $pdo): void {
    $materials = $pdo->query("SELECT id, name, COALESCE(unit, 'шт') AS unit FROM materials ORDER BY id ASC")->fetchAll();
    if (!$materials) {
        return;
    }
    $locations = [];
    foreach (['A', 'B', 'C'] as $zone) {
        for ($index = 1; $index <= 20; $index++) {
            $locations[] = $zone . '-' . str_pad((string)$index, 2, '0', STR_PAD_LEFT);
        }
    }
    $checkStmt = $pdo->prepare('SELECT COUNT(*) AS count_rows FROM warehouse_stock WHERE material_name = ?');
    $insertStmt = $pdo->prepare("
        INSERT INTO warehouse_stock (material_id, material_name, unit, quantity, min_stock, warehouse_name, location_code)
        VALUES (?, ?, ?, ?, ?, 'Склад на синявенской 11', ?)
    ");
    foreach ($materials as $offset => $material) {
        $checkStmt->execute([$material['name']]);
        $row = $checkStmt->fetch();
        if ((int)($row['count_rows'] ?? 0) > 0) {
            continue;
        }
        $quantity = rand(80, 250);
        $minStock = rand(20, 60);
        $location = $locations[$offset % count($locations)];
        $insertStmt->execute([
            $material['id'],
            $material['name'],
            $material['unit'] ?: 'шт',
            $quantity,
            $minStock,
            $location
        ]);
    }
}

function createNotification(PDO $pdo, ?int $userId, string $kind, string $title, string $message): void {
    $stmt = $pdo->prepare('INSERT INTO desktop_notifications (user_id, kind, title, message) VALUES (?, ?, ?, ?)');
    $stmt->execute([$userId, $kind, $title, $message]);
}

function maybeGenerateSupply(PDO $pdo): ?array {
    $metaStmt = $pdo->prepare("SELECT meta_value FROM desktop_meta WHERE meta_key = 'last_supply_at'");
    $metaStmt->execute();
    $meta = $metaStmt->fetch();
    $now = time();
    $lastSupplyAt = $meta ? strtotime((string)$meta['meta_value']) : 0;
    if ($lastSupplyAt > 0 && ($now - $lastSupplyAt) < 300) {
        return null;
    }
    $candidate = $pdo->query("
        SELECT id, material_name, unit, location_code
        FROM warehouse_stock
        ORDER BY RAND()
        LIMIT 1
    ")->fetch();
    if (!$candidate) {
        return null;
    }
    $quantity = rand(10, 80);
    $insertSupply = $pdo->prepare("
        INSERT INTO warehouse_supply_events (material_name, unit, quantity, location_code, processed)
        VALUES (?, ?, ?, ?, 0)
    ");
    $insertSupply->execute([
        $candidate['material_name'],
        $candidate['unit'] ?: 'шт',
        $quantity,
        $candidate['location_code']
    ]);
    $upsertMeta = $pdo->prepare("
        INSERT INTO desktop_meta (meta_key, meta_value)
        VALUES ('last_supply_at', ?)
        ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)
    ");
    $upsertMeta->execute([date('Y-m-d H:i:s', $now)]);
    createNotification(
        $pdo,
        null,
        'supply',
        'Новая поставка',
        'Поставка ' . $candidate['material_name'] . ' (' . $quantity . ' ' . ($candidate['unit'] ?: 'шт') . ') ожидает приёмки'
    );
    return [
        'material_name' => $candidate['material_name'],
        'unit' => $candidate['unit'] ?: 'шт',
        'quantity' => $quantity,
        'location_code' => $candidate['location_code']
    ];
}

function requireDesktopUser(PDO $pdo): array {
    $token = getDesktopToken();
    if ($token === '') {
        jsonResponse(['success' => false, 'message' => 'Нет токена авторизации'], 401);
    }
    $stmt = $pdo->prepare("
        SELECT s.token, s.user_id, s.role_name, s.expires_at, e.first_name, e.last_name, e.email
        FROM desktop_sessions s
        JOIN employees e ON e.id = s.user_id
        WHERE s.token = ?
        LIMIT 1
    ");
    $stmt->execute([$token]);
    $session = $stmt->fetch();
    if (!$session) {
        jsonResponse(['success' => false, 'message' => 'Сессия не найдена'], 401);
    }
    if (strtotime((string)$session['expires_at']) < time()) {
        $deleteStmt = $pdo->prepare('DELETE FROM desktop_sessions WHERE token = ?');
        $deleteStmt->execute([$token]);
        jsonResponse(['success' => false, 'message' => 'Сессия истекла'], 401);
    }
    $touchStmt = $pdo->prepare("
        UPDATE desktop_sessions
        SET last_seen_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL 1 DAY)
        WHERE token = ?
    ");
    $touchStmt->execute([$token]);
    return [
        'token' => $session['token'],
        'user_id' => (int)$session['user_id'],
        'role_name' => (string)$session['role_name'],
        'full_name' => trim(($session['first_name'] ?? '') . ' ' . ($session['last_name'] ?? '')),
        'email' => (string)$session['email']
    ];
}

ensureDesktopSchema($pdo);
seedWarehouseStock($pdo);
