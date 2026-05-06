<?php
declare(strict_types=1);

function envLoad(string $path): void {
    if (!is_file($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) {
        return;
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ($value !== '' && (($value[0] === '"' && str_ends_with($value, '"')) || ($value[0] === "'" && str_ends_with($value, "'")))) {
            $value = substr($value, 1, -1);
        }
        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

envLoad(dirname(__DIR__) . '/.env');

function env(string $key, ?string $default = null): ?string {
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }
    return $value;
}

function getAllowedOrigins(): array {
    $raw = env('ALLOWED_ORIGINS', 'https://sergey1337.pro-web24.ru,http://localhost:5173,http://127.0.0.1:5173');
    $parts = array_map('trim', explode(',', (string)$raw));
    return array_values(array_filter($parts, static fn($v) => $v !== ''));
}

function setSecurityHeaders(): void {
    header_remove('X-Powered-By');
    header('Content-Type: application/json; charset=utf-8');
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://sergey1337.pro-web24.ru");
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
}

function setCorsHeaders(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = getAllowedOrigins();
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, X-Requested-With, X-Desktop-Token');
}

function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function startSecureSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_name('fm_sid');
    session_start();
}

function getClientIp(): string {
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function ensureSecurityTables(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS security_audit_log (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            action_type VARCHAR(80) NOT NULL,
            action_details TEXT NOT NULL,
            request_path VARCHAR(255) NOT NULL,
            ip_address VARCHAR(64) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_security_audit_log_user (user_id),
            INDEX idx_security_audit_log_action (action_type),
            INDEX idx_security_audit_log_created (created_at)
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS login_attempts (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            ip_address VARCHAR(64) NOT NULL,
            success TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_login_attempts_email (email),
            INDEX idx_login_attempts_ip (ip_address),
            INDEX idx_login_attempts_created (created_at)
        )
    ");
}

function auditLog(PDO $pdo, ?int $userId, string $action, string $details): void {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO security_audit_log (user_id, action_type, action_details, request_path, ip_address)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $action,
            $details,
            $_SERVER['REQUEST_URI'] ?? '',
            getClientIp()
        ]);
    } catch (Throwable $e) {
    }
}

function checkRateLimit(PDO $pdo, string $email, string $ip, int $maxAttempts = 12, int $windowMinutes = 5): bool {
    $emailStmt = $pdo->prepare("
        SELECT COUNT(*) AS attempts
        FROM login_attempts
        WHERE email = ?
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
          AND success = 0
    ");
    $emailStmt->execute([$email, $windowMinutes]);
    $emailAttempts = (int)(($emailStmt->fetch())['attempts'] ?? 0);

    $ipStmt = $pdo->prepare("
        SELECT COUNT(*) AS attempts
        FROM login_attempts
        WHERE ip_address = ?
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
          AND success = 0
    ");
    $ipStmt->execute([$ip, $windowMinutes]);
    $ipAttempts = (int)(($ipStmt->fetch())['attempts'] ?? 0);

    if ($emailAttempts >= $maxAttempts) {
        return false;
    }

    // Мягкий IP-лимит, чтобы не блокировать все аккаунты в одной сети слишком рано.
    return $ipAttempts < 30;
}

function recordLoginAttempt(PDO $pdo, string $email, string $ip, bool $success): void {
    $stmt = $pdo->prepare("INSERT INTO login_attempts (email, ip_address, success) VALUES (?, ?, ?)");
    $stmt->execute([$email, $ip, $success ? 1 : 0]);
}

function isAuthenticated(): bool {
    return isset($_SESSION['user_id'], $_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function requireAuth(): void {
    if (!isAuthenticated()) {
        jsonResponse(['success' => false, 'message' => 'Не авторизован'], 401);
    }
}

function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function issueCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrf(): void {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
        return;
    }
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';
    if ($token === '' || $expected === '' || !hash_equals($expected, $token)) {
        jsonResponse(['success' => false, 'message' => 'CSRF token invalid'], 419);
    }
}

setSecurityHeaders();
setCorsHeaders();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}
startSecureSession();

$host = env('DB_HOST', 'localhost');
$dbname = env('DB_NAME', 'ct_sergey1337');
$username = env('DB_USER', 's270909_sergey');
$password = env('DB_PASSWORD', 'mRs1Beoc_s');

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    ensureSecurityTables($pdo);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Ошибка подключения к БД'], 500);
}
