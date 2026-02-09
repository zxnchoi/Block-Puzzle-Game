<?php

define('DB_HOST', 'sql207.infinityfree.com');
define('DB_NAME', 'if0_41090756_chrs');
define('DB_USER', 'if0_41090756');
define('DB_PASS', 'lnK0B9Uughdu1I');
define('DB_CHARSET', 'utf8mb4');

function getDBConnection() {
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    try {
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
}

function getJSONInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true);
}
