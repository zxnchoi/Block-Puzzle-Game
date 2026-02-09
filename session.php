<?php
/**
 * Session API
 * Handles session verification and logout
 */

require_once 'config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$db = getDBConnection();

/**
 * Get current session info
 */
if ($method === 'GET') {
    $sessionToken = $_GET['session_token'] ?? '';
    
    if (empty($sessionToken)) {
        jsonResponse(['error' => 'Session token required'], 400);
    }
    
    $stmt = $db->prepare('
        SELECT s.id, s.user_id, s.created_at, s.expires_at, u.name, u.username
        FROM sessions s
        INNER JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ? AND s.expires_at > NOW()
    ');
    $stmt->execute([$sessionToken]);
    $session = $stmt->fetch();
    
    if ($session) {
        jsonResponse([
            'valid' => true,
            'user_id' => $session['user_id'],
            'username' => $session['username'],
            'name' => $session['name'],
            'expires_at' => $session['expires_at']
        ]);
    } else {
        jsonResponse(['valid' => false, 'error' => 'Session expired or invalid'], 401);
    }
}

/**
 * Logout (destroy session)
 */
if ($method === 'DELETE') {
    $sessionToken = $_GET['session_token'] ?? '';
    
    if (empty($sessionToken)) {
        jsonResponse(['error' => 'Session token required'], 400);
    }
    
    $stmt = $db->prepare('DELETE FROM sessions WHERE session_token = ?');
    $stmt->execute([$sessionToken]);
    
    jsonResponse(['message' => 'Logged out successfully']);
}

/**
 * Refresh session (extend expiry)
 */
if ($method === 'PUT') {
    $sessionToken = $_GET['session_token'] ?? '';
    
    if (empty($sessionToken)) {
        jsonResponse(['error' => 'Session token required'], 400);
    }
    
    $stmt = $db->prepare('
        UPDATE sessions 
        SET expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)
        WHERE session_token = ? AND expires_at > NOW()
    ');
    $stmt->execute([$sessionToken]);
    
    if ($stmt->rowCount() > 0) {
        jsonResponse(['message' => 'Session refreshed successfully']);
    } else {
        jsonResponse(['error' => 'Could not refresh session'], 400);
    }
}
