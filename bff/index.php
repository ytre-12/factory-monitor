<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#^/bff#', '', $uriPath);

if ($path === '' || $path === '/') {
    echo json_encode(['success' => true, 'service' => 'factory-monitor-bff']);
    exit;
}

if ($path === '/health') {
    echo json_encode(['success' => true, 'status' => 'ok', 'time' => date('c')]);
    exit;
}

$apiBase = rtrim(getenv('API_BASE_URL') ?: 'https://sergey1337.pro-web24.ru/api', '/');
$target = $apiBase . $path;
$query = $_SERVER['QUERY_STRING'] ?? '';
if ($query !== '') {
    $target .= '?' . $query;
}

$payload = file_get_contents('php://input') ?: '';
$headers = [];
foreach ($_SERVER as $key => $value) {
    if (!str_starts_with($key, 'HTTP_')) {
        continue;
    }
    $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
    if (in_array($name, ['Host', 'Content-Length'], true)) {
        continue;
    }
    $headers[] = $name . ': ' . $value;
}
$headers[] = 'Accept: application/json';

$ch = curl_init($target);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);

if ($payload !== '') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
}

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => 'BFF upstream error']);
    curl_close($ch);
    exit;
}

$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$rawHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
curl_close($ch);

http_response_code($status ?: 500);
foreach (explode("\r\n", $rawHeaders) as $line) {
    if (stripos($line, 'Set-Cookie:') === 0) {
        header($line, false);
    }
}
echo $body;
