<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config/database.php';

function isMobileAuthenticated(): bool {
    return isset($_SESSION['mobile_user_id']);
}
