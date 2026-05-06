<?php
require_once __DIR__ . '/../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Метод не разрешен'], 405);
}

$token = getDesktopToken();
if ($token === '') {
    jsonResponse(['success' => true]);
}

$deleteStmt = $pdo->prepare("DELETE FROM desktop_sessions WHERE token = ?");
$deleteStmt->execute([$token]);

jsonResponse(['success' => true]);
