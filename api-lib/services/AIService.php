<?php
/**
 * AI Service Proxy
 * Handles communication with FastAPI AI microservice
 * Provides Speech-to-Text, Translation, and Text-to-Speech functionality
 */

class AIService {
    private $fastapi_url = 'http://127.0.0.1:8000';
    private $timeout = 60;
    private $debug = true;
    private $access_token = null;
    private $token_expires_at = null;
    private $use_https = false;
    private $allowed_origins = ['http://localhost', 'http://127.0.0.1'];

    /**
     * Constructor with JWT support
     * @param bool $use_https Enable HTTPS for service communication
     */
    public function __construct($use_https = false) {
        $this->use_https = $use_https;

        if ($use_https) {
            $this->fastapi_url = 'https://127.0.0.1:8000';
        }

        // Verify FastAPI service is running
        if (!$this->isServiceHealthy()) {
            throw new Exception('AI Service not available. Ensure FastAPI is running on ' . $this->fastapi_url);
        }

        // Obtain JWT token
        $this->obtainAccessToken();
    }

    /**
     * Get JWT access token from FastAPI service
     * @return bool Success status
     */
    private function obtainAccessToken() {
        try {
            $ch = curl_init($this->fastapi_url . '/token');
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Length: 0']);

            // Disable SSL verification for self-signed certificates
            if ($this->use_https) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            }

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($http_code !== 200) {
                throw new Exception("Failed to obtain JWT token (status $http_code)");
            }

            $data = json_decode($response, true);
            if (!isset($data['access_token'])) {
                throw new Exception("No token in response");
            }

            $this->access_token = $data['access_token'];
            $this->token_expires_at = time() + ($data['expires_in'] ?? 86400);
            $this->log("JWT token obtained successfully");

            return true;
        } catch (Exception $e) {
            $this->log("Failed to obtain token: " . $e->getMessage());
            throw new Exception("JWT authentication failed: " . $e->getMessage());
        }
    }

    /**
     * Check if token needs refresh
     * @return bool True if token needs refresh
     */
    private function isTokenExpired() {
        return $this->access_token === null || $this->token_expires_at <= (time() + 300);
    }

    /**
     * Refresh token if needed
     */
    private function refreshTokenIfNeeded() {
        if ($this->isTokenExpired()) {
            $this->obtainAccessToken();
        }
    }

    /**
     * Check if FastAPI service is healthy
     */
    public function isServiceHealthy() {
        try {
            $ch = curl_init($this->fastapi_url . '/health');
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HEADER, false);

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return $http_code === 200;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get service health status
     *
     * @return array Service status with model information
     */
    public function getHealth() {
        try {
            $response = $this->sendRequest('GET', '/health');
            return $response;
        } catch (Exception $e) {
            return [
                'error' => 'Health check failed: ' . $e->getMessage(),
                'status' => 'unavailable'
            ];
        }
    }

    /**
     * Speech-to-Text transcription (requires JWT authentication)
     *
     * @param string $audio_file Path to audio file
     * @param string $language Language code ('en' or 'rw')
     * @return array Transcribed text and metadata
     */
    public function transcribeAudio($audio_file, $language = 'en') {
        if (!file_exists($audio_file)) {
            throw new Exception("Audio file not found: $audio_file");
        }

        if (!in_array($language, ['en', 'rw'])) {
            throw new Exception("Invalid language. Must be 'en' or 'rw'");
        }

        try {
            // Refresh token if needed
            $this->refreshTokenIfNeeded();

            $ch = curl_init($this->fastapi_url . '/stt');
            curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);

            // Prepare multipart form data
            $cfile = curl_file_create($audio_file);
            $post_data = [
                'audio' => $cfile,
                'language' => $language
            ];

            curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);

            // Add JWT authentication header
            $headers = [
                'Authorization: Bearer ' . $this->access_token
            ];
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

            // Disable SSL verification for self-signed certificates
            if ($this->use_https) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            }

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error) {
                throw new Exception("CURL Error: $error");
            }

            // Handle 401 Unauthorized - token expired
            if ($http_code === 401) {
                $this->obtainAccessToken();
                return $this->transcribeAudio($audio_file, $language);
            }

            if ($http_code !== 200) {
                $response_data = json_decode($response, true);
                throw new Exception("STT request failed with status $http_code: " . ($response_data['detail'] ?? 'Unknown error'));
            }

            return json_decode($response, true);
        } catch (Exception $e) {
            throw new Exception("Speech-to-Text failed: " . $e->getMessage());
        }
    }

    /**
     * Translate text between languages
     *
     * @param string $text Text to translate
     * @param string $direction Translation direction ('en-rw' or 'rw-en')
     * @return array Translated text
     */
    public function translateText($text, $direction = 'en-rw') {
        if (empty($text)) {
            throw new Exception("Text cannot be empty");
        }

        if (!in_array($direction, ['en-rw', 'rw-en'])) {
            throw new Exception("Invalid direction. Must be 'en-rw' or 'rw-en'");
        }

        try {
            $post_data = [
                'text' => $text,
                'direction' => $direction
            ];

            $response = $this->sendRequest('POST', '/translate', $post_data);
            return $response;
        } catch (Exception $e) {
            throw new Exception("Translation failed: " . $e->getMessage());
        }
    }

    /**
     * Text-to-Speech synthesis (Kinyarwanda)
     *
     * @param string $text Text to synthesize
     * @return array Audio file path and metadata
     */
    public function synthesizeSpeechRW($text) {
        if (empty($text)) {
            throw new Exception("Text cannot be empty");
        }

        try {
            $post_data = ['text' => $text];
            $response = $this->sendRequest('POST', '/tts-rw', $post_data);
            return $response;
        } catch (Exception $e) {
            throw new Exception("Kinyarwanda TTS failed: " . $e->getMessage());
        }
    }

    /**
     * Text-to-Speech synthesis (English)
     *
     * @param string $text Text to synthesize
     * @return array Audio file path and metadata
     */
    public function synthesizeSpeechEN($text) {
        if (empty($text)) {
            throw new Exception("Text cannot be empty");
        }

        try {
            $post_data = ['text' => $text];
            $response = $this->sendRequest('POST', '/tts-en', $post_data);
            return $response;
        } catch (Exception $e) {
            throw new Exception("English TTS failed: " . $e->getMessage());
        }
    }

    /**
     * Full pipeline: STT -> Translation (requires JWT authentication)
     *
     * @param string $audio_file Path to audio file
     * @param string $source_language Source language ('en' or 'rw')
     * @param string $target_language Target language ('en' or 'rw')
     * @return array Recognized text and translation
     */
    public function pipelineSTTTranslate($audio_file, $source_language = 'en', $target_language = 'rw') {
        if (!file_exists($audio_file)) {
            throw new Exception("Audio file not found: $audio_file");
        }

        if (!in_array($source_language, ['en', 'rw']) || !in_array($target_language, ['en', 'rw'])) {
            throw new Exception("Invalid language codes");
        }

        try {
            // Refresh token if needed
            $this->refreshTokenIfNeeded();

            $ch = curl_init($this->fastapi_url . '/pipeline');
            curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);

            $cfile = curl_file_create($audio_file);
            $post_data = [
                'audio' => $cfile,
                'source_language' => $source_language,
                'target_language' => $target_language
            ];

            curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);

            // Add JWT authentication header
            $headers = [
                'Authorization: Bearer ' . $this->access_token
            ];
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

            // Disable SSL verification for self-signed certificates
            if ($this->use_https) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            }

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error) {
                throw new Exception("CURL Error: $error");
            }

            // Handle 401 Unauthorized - token expired
            if ($http_code === 401) {
                $this->obtainAccessToken();
                return $this->pipelineSTTTranslate($audio_file, $source_language, $target_language);
            }

            if ($http_code !== 200) {
                $response_data = json_decode($response, true);
                throw new Exception("Pipeline request failed with status $http_code: " . ($response_data['detail'] ?? 'Unknown error'));
            }

            return json_decode($response, true);
        } catch (Exception $e) {
            throw new Exception("Pipeline failed: " . $e->getMessage());
        }
    }

    /**
     * Send HTTP request to FastAPI service with JWT authentication
     *
     * @param string $method HTTP method (GET, POST, etc.)
     * @param string $endpoint API endpoint
     * @param array $data POST data (for form-encoded requests)
     * @return array Decoded JSON response
     */
    private function sendRequest($method, $endpoint, $data = null) {
        try {
            // Refresh token if needed
            $this->refreshTokenIfNeeded();

            $url = $this->fastapi_url . $endpoint;

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

            // Set headers with JWT authentication
            $headers = [
                'Accept: application/json',
                'Authorization: Bearer ' . $this->access_token
            ];

            if ($method === 'POST' && $data !== null) {
                curl_setopt($ch, CURLOPT_POST, true);

                // Use application/x-www-form-urlencoded for form data
                $post_data = http_build_query($data);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
                $headers[] = 'Content-Type: application/x-www-form-urlencoded';
            }

            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

            // Disable SSL verification for self-signed certificates
            if ($this->use_https) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            }

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error) {
                throw new Exception("CURL Error: $error");
            }

            // Handle 401 Unauthorized - token expired
            if ($http_code === 401) {
                $this->obtainAccessToken();
                return $this->sendRequest($method, $endpoint, $data);
            }

            if ($http_code !== 200) {
                $response_data = json_decode($response, true);
                $error_msg = $response_data['detail'] ?? $response_data['error'] ?? $response;
                throw new Exception("API returned status $http_code: " . (is_array($error_msg) ? json_encode($error_msg) : $error_msg));
            }

            return json_decode($response, true);
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * Get audio file from FastAPI service
     * Note: Audio files are generated in the FastAPI outputs directory
     *
     * @param string $relative_path Relative path from FastAPI root
     * @return string Full URL to audio file
     */
    public function getAudioUrl($relative_path) {
        // Construct the full path to the audio file
        return $this->fastapi_url . '/' . ltrim($relative_path, '/');
    }

    /**
     * Download audio file from FastAPI service
     *
     * @param string $relative_path Relative path to audio file
     * @param string $save_path Where to save the file locally
     * @return bool Success status
     */
    public function downloadAudio($relative_path, $save_path) {
        try {
            $url = $this->fastapi_url . '/' . ltrim($relative_path, '/');

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($http_code !== 200) {
                throw new Exception("Failed to download audio file (status $http_code)");
            }

            // Ensure directory exists
            $dir = dirname($save_path);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            if (file_put_contents($save_path, $response)) {
                return true;
            } else {
                throw new Exception("Failed to save audio file");
            }
        } catch (Exception $e) {
            throw new Exception("Audio download failed: " . $e->getMessage());
        }
    }

    /**
     * Log request for debugging
     */
    private function log($message) {
        if ($this->debug) {
            error_log('[AIService] ' . $message);
        }
    }
}
?>
