<?php
/**
 * AI Service Routes
 * Handles all AI-related API endpoints
 * Routes requests to the FastAPI microservice via AIService
 */

require_once __DIR__ . '/../services/AIService.php';

class AIRoutes {
    private $ai_service;
    private $request_method;
    private $request_path;

    public function __construct() {
        try {
            $this->ai_service = new AIService();
            $this->request_method = $_SERVER['REQUEST_METHOD'];
            $this->request_path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        } catch (Exception $e) {
            $this->respondError('AI Service initialization failed: ' . $e->getMessage(), 503);
            exit;
        }
    }

    /**
     * Route incoming requests
     */
    public function route() {
        // Extract action from request
        $path_parts = explode('/', trim($this->request_path, '/'));
        $action = end($path_parts);

        // Route based on action and method
        switch ($action) {
            case 'ai-health':
                return $this->getHealth();

            case 'ai-stt':
                return $this->transcribeAudio();

            case 'ai-translate':
                return $this->translateText();

            case 'ai-tts-rw':
                return $this->synthesizeSpeechRW();

            case 'ai-tts-en':
                return $this->synthesizeSpeechEN();

            case 'ai-pipeline':
                return $this->pipelineSTTTranslate();

            default:
                return $this->respondError('Unknown AI endpoint: ' . $action, 404);
        }
    }

    /**
     * GET /api/ai-health
     * Check AI service health status
     */
    private function getHealth() {
        if ($this->request_method !== 'GET') {
            return $this->respondError('Method not allowed', 405);
        }

        try {
            $health = $this->ai_service->getHealth();

            if (isset($health['status']) && $health['status'] === 'ready') {
                return $this->respondSuccess($health, 200);
            } else {
                return $this->respondError('AI Service not ready', 503);
            }
        } catch (Exception $e) {
            return $this->respondError($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/ai-stt
     * Transcribe audio file
     * Parameters: audio (file), language ('en' or 'rw')
     */
    private function transcribeAudio() {
        if ($this->request_method !== 'POST') {
            return $this->respondError('Method not allowed', 405);
        }

        try {
            // Check for uploaded audio file
            if (!isset($_FILES['audio'])) {
                return $this->respondError('No audio file provided', 400);
            }

            $audio_file = $_FILES['audio']['tmp_name'];
            $language = $_POST['language'] ?? 'en';

            // Validate language
            if (!in_array($language, ['en', 'rw'])) {
                return $this->respondError("Invalid language. Must be 'en' or 'rw'", 400);
            }

            // Transcribe
            $result = $this->ai_service->transcribeAudio($audio_file, $language);

            return $this->respondSuccess($result, 200);
        } catch (Exception $e) {
            return $this->respondError($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/ai-translate
     * Translate text
     * Parameters: text (string), direction ('en-rw' or 'rw-en')
     */
    private function translateText() {
        if ($this->request_method !== 'POST') {
            return $this->respondError('Method not allowed', 405);
        }

        try {
            $input = $this->getJSONInput();

            if (!isset($input['text'])) {
                return $this->respondError('Missing required parameter: text', 400);
            }

            $text = $input['text'];
            $direction = $input['direction'] ?? 'en-rw';

            // Validate inputs
            if (empty(trim($text))) {
                return $this->respondError('Text cannot be empty', 400);
            }

            if (!in_array($direction, ['en-rw', 'rw-en'])) {
                return $this->respondError("Invalid direction. Must be 'en-rw' or 'rw-en'", 400);
            }

            // Translate
            $result = $this->ai_service->translateText($text, $direction);

            return $this->respondSuccess($result, 200);
        } catch (Exception $e) {
            return $this->respondError($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/ai-tts-rw
     * Synthesize Kinyarwanda speech
     * Parameters: text (string)
     */
    private function synthesizeSpeechRW() {
        if ($this->request_method !== 'POST') {
            return $this->respondError('Method not allowed', 405);
        }

        try {
            $input = $this->getJSONInput();

            if (!isset($input['text'])) {
                return $this->respondError('Missing required parameter: text', 400);
            }

            $text = $input['text'];

            if (empty(trim($text))) {
                return $this->respondError('Text cannot be empty', 400);
            }

            // Synthesize speech
            $result = $this->ai_service->synthesizeSpeechRW($text);

            return $this->respondSuccess($result, 200);
        } catch (Exception $e) {
            return $this->respondError($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/ai-tts-en
     * Synthesize English speech
     * Parameters: text (string)
     */
    private function synthesizeSpeechEN() {
        if ($this->request_method !== 'POST') {
            return $this->respondError('Method not allowed', 405);
        }

        try {
            $input = $this->getJSONInput();

            if (!isset($input['text'])) {
                return $this->respondError('Missing required parameter: text', 400);
            }

            $text = $input['text'];

            if (empty(trim($text))) {
                return $this->respondError('Text cannot be empty', 400);
            }

            // Synthesize speech
            $result = $this->ai_service->synthesizeSpeechEN($text);

            return $this->respondSuccess($result, 200);
        } catch (Exception $e) {
            return $this->respondError($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/ai-pipeline
     * Full pipeline: STT -> Translation
     * Parameters: audio (file), source_language, target_language
     */
    private function pipelineSTTTranslate() {
        if ($this->request_method !== 'POST') {
            return $this->respondError('Method not allowed', 405);
        }

        try {
            // Check for uploaded audio file
            if (!isset($_FILES['audio'])) {
                return $this->respondError('No audio file provided', 400);
            }

            $audio_file = $_FILES['audio']['tmp_name'];
            $source_language = $_POST['source_language'] ?? 'en';
            $target_language = $_POST['target_language'] ?? 'rw';

            // Validate languages
            if (!in_array($source_language, ['en', 'rw']) || !in_array($target_language, ['en', 'rw'])) {
                return $this->respondError("Invalid language codes", 400);
            }

            // Run pipeline
            $result = $this->ai_service->pipelineSTTTranslate($audio_file, $source_language, $target_language);

            return $this->respondSuccess($result, 200);
        } catch (Exception $e) {
            return $this->respondError($e->getMessage(), 500);
        }
    }

    /**
     * Get JSON input from request body
     */
    private function getJSONInput() {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        // Fall back to POST parameters if JSON parsing fails
        if ($data === null) {
            $data = $_POST;
        }

        return $data ?? [];
    }

    /**
     * Send success response
     */
    private function respondSuccess($data, $http_code = 200) {
        http_response_code($http_code);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Send error response
     */
    private function respondError($message, $http_code = 400) {
        http_response_code($http_code);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => $message
        ]);
    }
}

// Route incoming requests
$router = new AIRoutes();
$router->route();
?>
