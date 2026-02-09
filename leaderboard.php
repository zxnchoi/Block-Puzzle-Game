<?php
/**
 * Leaderboard API
 * Handles score submissions and leaderboard retrieval
 * Maintains only ONE entry per user (highest score)
 */

require_once 'config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$db = getDBConnection();

/**
 * Get leaderboard - returns only highest score per user
 */
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'getTop') {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        
        // Get highest score per user
        $sql = '
            SELECT l.id, l.user_id, l.name, l.strand, l.score, l.`lines`, l.level, l.difficulty, l.timestamp, l.date
            FROM leaderboard l
            INNER JOIN (
                SELECT user_id, MAX(score) as max_score
                FROM leaderboard
                GROUP BY user_id
            ) max_scores ON l.user_id = max_scores.user_id AND l.score = max_scores.max_score
            ORDER BY l.score DESC
            LIMIT ?
        ';
        $stmt = $db->prepare($sql);
        $stmt->execute([$limit]);
        jsonResponse($stmt->fetchAll());
    } elseif ($action === 'getAll') {
        // Get highest score per user
        $sql = '
            SELECT l.id, l.user_id, l.name, l.strand, l.score, l.`lines`, l.level, l.difficulty, l.timestamp, l.date
            FROM leaderboard l
            INNER JOIN (
                SELECT user_id, MAX(score) as max_score
                FROM leaderboard
                GROUP BY user_id
            ) max_scores ON l.user_id = max_scores.user_id AND l.score = max_scores.max_score
            ORDER BY l.score DESC
        ';
        $stmt = $db->query($sql);
        jsonResponse($stmt->fetchAll());
    } elseif ($action === 'getByUser') {
        $userId = $_GET['user_id'] ?? '';
        if (empty($userId)) {
            jsonResponse(['error' => 'User ID required'], 400);
        }
        
        $stmt = $db->prepare('SELECT * FROM leaderboard WHERE user_id = ? ORDER BY score DESC LIMIT 1');
        $stmt->execute([$userId]);
        $score = $stmt->fetch();
        
        if ($score) {
            jsonResponse($score);
        } else {
            jsonResponse(['error' => 'No scores found for user'], 404);
        }
    } else {
        jsonResponse(['error' => 'Invalid action. Use: getTop, getAll, or getByUser'], 400);
    }
}

/**
 * Add new score - maintains only highest score per user
 */
if ($method === 'POST') {
    $data = getJSONInput();
    
    // Validate required fields
    $required = ['user_id', 'name', 'strand', 'score', 'lines', 'level', 'difficulty'];
    foreach ($required as $field) {
        if (!isset($data[$field]) && $field !== 'lines' && $field !== 'level' && $field !== 'difficulty') {
            jsonResponse(['error' => "Missing required field: $field"], 400);
        }
    }
    
    $sessionToken = $data['session_token'] ?? '';
    if (empty($sessionToken)) {
        jsonResponse(['error' => 'Session token required'], 401);
    }
    
    // Verify session
    $stmt = $db->prepare('SELECT user_id FROM sessions WHERE session_token = ? AND expires_at > NOW()');
    $stmt->execute([$sessionToken]);
    $session = $stmt->fetch();
    
    if (!$session) {
        jsonResponse(['error' => 'Invalid or expired session'], 401);
    }
    
    // Verify user ID matches session
    if ($session['user_id'] != $data['user_id']) {
        jsonResponse(['error' => 'User ID does not match session'], 403);
    }
    
    $userId = $data['user_id'];
    $score = (int)$data['score'];
    
    // Check if user already has a score in leaderboard
    $stmt = $db->prepare('SELECT id, score FROM leaderboard WHERE user_id = ? ORDER BY score DESC LIMIT 1');
    $stmt->execute([$userId]);
    $existingScore = $stmt->fetch();
    
    if ($existingScore) {
        // Only update if new score is higher
        if ($score > $existingScore['score']) {
            $stmt = $db->prepare('
                UPDATE leaderboard 
                SET score = ?, `lines` = ?, level = ?, difficulty = ?, timestamp = NOW(), date = CURDATE()
                WHERE id = ?
            ');
            $stmt->execute([$score, $data['lines'] ?? 0, $data['level'] ?? 1, $data['difficulty'] ?? 'easy', $existingScore['id']]);
            
            // Update user's high score
            $stmt = $db->prepare('UPDATE users SET high_score = ? WHERE id = ?');
            $stmt->execute([$score, $userId]);
            
            jsonResponse([
                'message' => 'Score updated (new high score)',
                'score_id' => $existingScore['id'],
                'is_new_high' => true
            ]);
        } else {
            jsonResponse([
                'message' => 'Score not updated (not higher than current high score)',
                'score_id' => $existingScore['id'],
                'is_new_high' => false
            ]);
        }
    } else {
        // Insert new score
        $stmt = $db->prepare('
            INSERT INTO leaderboard (user_id, name, strand, score, `lines`, level, difficulty, timestamp, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), CURDATE())
        ');
        $stmt->execute([
            $userId,
            $data['name'],
            $data['strand'],
            $score,
            $data['lines'] ?? 0,
            $data['level'] ?? 1,
            $data['difficulty'] ?? 'easy'
        ]);
        
        $scoreId = $db->lastInsertId();
        
        // Update user's high score
        $stmt = $db->prepare('UPDATE users SET high_score = ? WHERE id = ?');
        $stmt->execute([$score, $userId]);
        
        // Update user's games played and total score
        $stmt = $db->prepare('
            UPDATE users 
            SET games_played = games_played + 1, total_score = total_score + ?
            WHERE id = ?
        ');
        $stmt->execute([$score, $userId]);
        
        jsonResponse([
            'message' => 'Score added successfully',
            'score_id' => $scoreId,
            'is_new_high' => true
        ]);
    }
}

/**
 * Delete score (admin or self)
 */
if ($method === 'DELETE') {
    $scoreId = $_GET['score_id'] ?? '';
    $sessionToken = $_GET['session_token'] ?? '';
    
    if (empty($scoreId) || empty($sessionToken)) {
        jsonResponse(['error' => 'Score ID and session token required'], 400);
    }
    
    // Verify session
    $stmt = $db->prepare('SELECT user_id FROM sessions WHERE session_token = ? AND expires_at > NOW()');
    $stmt->execute([$sessionToken]);
    $session = $stmt->fetch();
    
    if (!$session) {
        jsonResponse(['error' => 'Invalid or expired session'], 401);
    }
    
    // Check ownership
    $stmt = $db->prepare('SELECT user_id FROM leaderboard WHERE id = ?');
    $stmt->execute([$scoreId]);
    $score = $stmt->fetch();
    
    if (!$score) {
        jsonResponse(['error' => 'Score not found'], 404);
    }
    
    if ($score['user_id'] != $session['user_id']) {
        jsonResponse(['error' => 'Not authorized to delete this score'], 403);
    }
    
    $stmt = $db->prepare('DELETE FROM leaderboard WHERE id = ?');
    $stmt->execute([$scoreId]);
    
    jsonResponse(['message' => 'Score deleted successfully']);
}

/**
 * Recalculate leaderboard (keeps only highest score per user)
 * Utility endpoint to clean up duplicate entries
 */
if ($method === 'PUT') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'cleanup') {
        // Delete all entries except highest score per user
        $sql = '
            DELETE l FROM leaderboard l
            WHERE l.id NOT IN (
                SELECT id FROM (
                    SELECT l2.id
                    FROM leaderboard l2
                    INNER JOIN (
                        SELECT user_id, MAX(score) as max_score
                        FROM leaderboard
                        GROUP BY user_id
                    ) max_scores ON l2.user_id = max_scores.user_id AND l2.score = max_scores.max_score
                ) keep
            )
        ';
        $stmt = $db->exec($sql);
        
        $deleted = $stmt ? $stmt->rowCount() : 0;
        jsonResponse(['message' => "Cleaned up $deleted duplicate entries", 'deleted_count' => $deleted]);
    }
}
