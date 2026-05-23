<?php
/**
 * AI Service API Endpoint
 * Entry point for all AI-related requests
 * Routes requests to appropriate handlers
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../server.log');

// Set response headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Require the AI routes handler
try {
    require_once __DIR__ . '/../api-lib/routes/aiRoutes.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to load AI service: ' . $e->getMessage()
    ]);
    exit;
}
?>
