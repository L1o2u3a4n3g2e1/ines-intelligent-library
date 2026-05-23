<?php
/**
 * Phase 4: PHP Integration Testing
 * Tests the PHP integration layer with the FastAPI service
 */

require_once __DIR__ . '/api-lib/services/AIService.php';

class Phase4Tester {
    private $ai_service;
    private $passed = 0;
    private $failed = 0;

    public function __construct() {
        echo "\n";
        echo "==========================================================\n";
        echo "PHASE 4: PHP INTEGRATION TESTING\n";
        echo "==========================================================\n";
        echo "\n";

        try {
            $this->ai_service = new AIService();
            $this->printSuccess("AIService initialized successfully");
        } catch (Exception $e) {
            $this->printError("Failed to initialize AIService: " . $e->getMessage());
            exit(1);
        }
    }

    /**
     * Run all tests
     */
    public function runTests() {
        echo "\nRunning 6 integration tests...\n";

        $this->testHealthEndpoint();
        $this->testTranslationEN2RW();
        $this->testTranslationRW2EN();
        $this->testTTSKinyarwanda();
        $this->testTTSEnglish();
        $this->testErrorHandling();

        $this->printSummary();
    }

    /**
     * Test 1: Health endpoint
     */
    private function testHealthEndpoint() {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "TEST 1: Health Endpoint\n";
        echo str_repeat("=", 60) . "\n";

        try {
            $health = $this->ai_service->getHealth();

            if (isset($health['status']) && $health['status'] === 'ready') {
                $this->printSuccess("Health endpoint returned ready status");
                echo "[INFO] Device: " . ($health['device'] ?? 'unknown') . "\n";

                if (isset($health['models'])) {
                    echo "[INFO] Models:\n";
                    foreach ($health['models'] as $model => $status) {
                        if ($status === 'loaded') {
                            echo "  [OK] $model: $status\n";
                        } else {
                            echo "  [WARN] $model: $status\n";
                        }
                    }
                }
                $this->passed++;
            } else {
                $this->printError("Health endpoint status not ready");
                $this->failed++;
            }
        } catch (Exception $e) {
            $this->printError("Health check failed: " . $e->getMessage());
            $this->failed++;
        }
    }

    /**
     * Test 2: English to Kinyarwanda translation
     */
    private function testTranslationEN2RW() {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "TEST 2: Translation (EN to RW)\n";
        echo str_repeat("=", 60) . "\n";

        try {
            $test_text = "Hello, how are you?";
            $this->printInfo("Translating: \"$test_text\"");

            $result = $this->ai_service->translateText($test_text, 'en-rw');

            if (isset($result['translation'])) {
                $translation = $result['translation'];
                echo "[INFO] Translation: \"$translation\"\n";
                $this->printSuccess("EN->RW translation successful");
                $this->passed++;
            } else {
                $this->printError("No translation in response");
                $this->failed++;
            }
        } catch (Exception $e) {
            $this->printError("EN->RW translation failed: " . $e->getMessage());
            $this->failed++;
        }
    }

    /**
     * Test 3: Kinyarwanda to English translation
     */
    private function testTranslationRW2EN() {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "TEST 3: Translation (RW to EN)\n";
        echo str_repeat("=", 60) . "\n";

        try {
            $test_text = "Muraho, wacu ni iki?";
            $this->printInfo("Translating: \"$test_text\"");

            $result = $this->ai_service->translateText($test_text, 'rw-en');

            if (isset($result['translation'])) {
                $translation = $result['translation'];
                echo "[INFO] Translation: \"$translation\"\n";
                $this->printSuccess("RW->EN translation successful");
                $this->passed++;
            } else {
                $this->printError("No translation in response");
                $this->failed++;
            }
        } catch (Exception $e) {
            $this->printError("RW->EN translation failed: " . $e->getMessage());
            $this->failed++;
        }
    }

    /**
     * Test 4: Kinyarwanda TTS
     */
    private function testTTSKinyarwanda() {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "TEST 4: Kinyarwanda Text-to-Speech\n";
        echo str_repeat("=", 60) . "\n";

        try {
            $test_text = "Ijambo ry'ubwire";
            $this->printInfo("Generating speech: \"$test_text\"");

            $result = $this->ai_service->synthesizeSpeechRW($test_text);

            if (isset($result['audio_file'])) {
                $audio_file = $result['audio_file'];
                echo "[INFO] Audio file: $audio_file\n";
                $this->printSuccess("Kinyarwanda TTS successful");
                $this->passed++;
            } else {
                $this->printError("No audio file in response");
                $this->failed++;
            }
        } catch (Exception $e) {
            $this->printError("Kinyarwanda TTS failed: " . $e->getMessage());
            $this->failed++;
        }
    }

    /**
     * Test 5: English TTS
     */
    private function testTTSEnglish() {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "TEST 5: English Text-to-Speech\n";
        echo str_repeat("=", 60) . "\n";

        try {
            $test_text = "Hello world";
            $this->printInfo("Generating speech: \"$test_text\"");

            $result = $this->ai_service->synthesizeSpeechEN($test_text);

            if (isset($result['audio_file'])) {
                $audio_file = $result['audio_file'];
                echo "[INFO] Audio file: $audio_file\n";
                $this->printSuccess("English TTS successful");
                $this->passed++;
            } else {
                $this->printError("No audio file in response");
                $this->failed++;
            }
        } catch (Exception $e) {
            $this->printError("English TTS failed: " . $e->getMessage());
            $this->failed++;
        }
    }

    /**
     * Test 6: Error handling
     */
    private function testErrorHandling() {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "TEST 6: Error Handling\n";
        echo str_repeat("=", 60) . "\n";

        $errors_caught = 0;

        // Test 1: Invalid language for translation
        echo "[INFO] Testing invalid translation direction...\n";
        try {
            $this->ai_service->translateText("test", 'invalid');
            echo "[WARN] Invalid direction should throw exception\n";
        } catch (Exception $e) {
            $this->printSuccess("Caught exception for invalid direction");
            $errors_caught++;
        }

        // Test 2: Empty text
        echo "[INFO] Testing empty text...\n";
        try {
            $this->ai_service->translateText("", 'en-rw');
            echo "[WARN] Empty text should throw exception\n";
        } catch (Exception $e) {
            $this->printSuccess("Caught exception for empty text");
            $errors_caught++;
        }

        // Test 3: Empty TTS text
        echo "[INFO] Testing empty TTS text...\n";
        try {
            $this->ai_service->synthesizeSpeechEN("");
            echo "[WARN] Empty TTS text should throw exception\n";
        } catch (Exception $e) {
            $this->printSuccess("Caught exception for empty TTS text");
            $errors_caught++;
        }

        if ($errors_caught >= 2) {
            $this->printSuccess("Error handling working correctly");
            $this->passed++;
        } else {
            $this->printError("Error handling not working as expected");
            $this->failed++;
        }
    }

    /**
     * Print summary
     */
    private function printSummary() {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "TEST SUMMARY\n";
        echo str_repeat("=", 60) . "\n";

        $total = $this->passed + $this->failed;
        echo "[INFO] Passed: " . $this->passed . "/$total\n";
        echo "[INFO] Failed: " . $this->failed . "/$total\n";

        echo "\n";
        if ($this->failed === 0) {
            $this->printSuccess("ALL TESTS PASSED!");
            echo "\n[INFO] PHP Integration is working correctly.\n";
            echo "[INFO] Ready for Phase 5: Quality Evaluation & Documentation\n";
            return 0;
        } else {
            $this->printError($this->failed . " test(s) failed");
            return 1;
        }
    }

    /**
     * Print helper functions
     */
    private function printSuccess($message) {
        echo "[OK] " . $message . "\n";
    }

    private function printError($message) {
        echo "[FAIL] " . $message . "\n";
    }

    private function printInfo($message) {
        echo "[INFO] " . $message . "\n";
    }
}

// Run tests
$tester = new Phase4Tester();
$tester->runTests();
?>
