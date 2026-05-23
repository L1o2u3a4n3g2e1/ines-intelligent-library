<?php
/**
 * Monitoring Service for Digital Library AI
 * Provides access to service metrics and health status from PHP applications
 */

class MonitoringService
{
    private $baseURL;
    private $timeout = 10;
    private $cache = [];
    private $cache_ttl = 5; // Cache metrics for 5 seconds

    public function __construct($baseURL = "http://127.0.0.1:8000")
    {
        $this->baseURL = rtrim($baseURL, '/');
    }

    /**
     * Get service health status
     * @return array Health status with model information
     */
    public function getHealth()
    {
        if ($this->isCached('health')) {
            return $this->getFromCache('health');
        }

        try {
            $response = $this->makeRequest('/health');
            $this->setCache('health', $response);
            return $response;
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'error' => $e->getMessage(),
                'device' => 'unknown',
                'models' => []
            ];
        }
    }

    /**
     * Get performance metrics
     * @return array Comprehensive metrics for all endpoints
     */
    public function getMetrics()
    {
        if ($this->isCached('metrics')) {
            return $this->getFromCache('metrics');
        }

        try {
            $response = $this->makeRequest('/metrics');
            $this->setCache('metrics', $response);
            return $response;
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'error' => $e->getMessage(),
                'endpoints' => []
            ];
        }
    }

    /**
     * Get recent errors
     * @param int $limit Maximum number of errors to return
     * @return array List of recent errors
     */
    public function getRecentErrors($limit = 20)
    {
        try {
            return $this->makeRequest("/errors?limit=$limit");
        } catch (Exception $e) {
            return [
                'errors' => [],
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get rate limit events
     * @param int $limit Maximum number of events to return
     * @return array List of rate limit hits
     */
    public function getRateLimitEvents($limit = 20)
    {
        try {
            return $this->makeRequest("/rate-limits?limit=$limit");
        } catch (Exception $e) {
            return [
                'rate_limit_events' => [],
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get authentication failures
     * @param int $limit Maximum number of events to return
     * @return array List of auth failures
     */
    public function getAuthFailures($limit = 20)
    {
        try {
            return $this->makeRequest("/auth-failures?limit=$limit");
        } catch (Exception $e) {
            return [
                'auth_failures' => [],
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check overall service health status
     * @return string Health status: 'healthy', 'degraded', 'unhealthy', or 'unknown'
     */
    public function getHealthStatus()
    {
        $health = $this->getHealth();
        $metrics = $this->getMetrics();

        if (isset($health['status']) && $health['status'] === 'ready') {
            // Check for degradation
            if (isset($metrics['total_requests']) && $metrics['total_requests'] > 0) {
                $errorRate = ($metrics['total_errors'] / $metrics['total_requests']) * 100;

                if ($errorRate > 5) {
                    return 'unhealthy';
                } elseif ($errorRate > 1) {
                    return 'degraded';
                }
            }
            return 'healthy';
        }

        return 'unknown';
    }

    /**
     * Get endpoint-specific metrics
     * @param string $endpoint Endpoint name (e.g., '/translate', '/stt')
     * @return array Metrics for the specified endpoint
     */
    public function getEndpointMetrics($endpoint)
    {
        $metrics = $this->getMetrics();

        if (isset($metrics['endpoints'][$endpoint])) {
            return $metrics['endpoints'][$endpoint];
        }

        return null;
    }

    /**
     * Check if a specific endpoint is healthy
     * @param string $endpoint Endpoint name
     * @return bool True if endpoint is healthy
     */
    public function isEndpointHealthy($endpoint)
    {
        $metrics = $this->getEndpointMetrics($endpoint);

        if (!$metrics) {
            return false;
        }

        // Consider unhealthy if error rate > 5%
        $errorRate = (float) str_replace('%', '', $metrics['error_rate']);
        return $errorRate <= 5.0;
    }

    /**
     * Get service statistics summary
     * @return array Summary statistics
     */
    public function getSummary()
    {
        $health = $this->getHealth();
        $metrics = $this->getMetrics();

        return [
            'service_status' => $health['status'] ?? 'unknown',
            'health_check' => $this->getHealthStatus(),
            'uptime' => $metrics['uptime_seconds'] ?? 0,
            'uptime_formatted' => $this->formatUptime($metrics['uptime_seconds'] ?? 0),
            'total_requests' => $metrics['total_requests'] ?? 0,
            'total_errors' => $metrics['total_errors'] ?? 0,
            'error_rate' => $this->calculateErrorRate($metrics),
            'models_loaded' => $this->countLoadedModels($health),
            'rate_limit_hits' => $metrics['total_rate_limits'] ?? 0,
            'auth_failures' => $metrics['auth_failures'] ?? 0,
            'device' => $health['device'] ?? 'unknown',
            'last_updated' => $metrics['timestamp'] ?? date('c')
        ];
    }

    /**
     * Generate HTML status report
     * @return string HTML report
     */
    public function generateHTMLReport()
    {
        $summary = $this->getSummary();
        $health = $this->getHealth();
        $metrics = $this->getMetrics();

        $statusClass = match ($summary['health_check']) {
            'healthy' => 'status-healthy',
            'degraded' => 'status-degraded',
            default => 'status-unhealthy'
        };

        $html = <<<HTML
        <div class="monitoring-report" style="font-family: Arial, sans-serif; margin: 20px;">
            <h2>Digital Library AI Service - Status Report</h2>

            <div class="$statusClass" style="padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <strong>Overall Status:</strong> {$summary['health_check']} |
                <strong>Uptime:</strong> {$summary['uptime_formatted']}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="padding: 15px; background: #f5f5f5; border-radius: 5px;">
                    <h3>Service Metrics</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td><strong>Total Requests:</strong></td>
                            <td>{$summary['total_requests']}</td>
                        </tr>
                        <tr>
                            <td><strong>Total Errors:</strong></td>
                            <td>{$summary['total_errors']}</td>
                        </tr>
                        <tr>
                            <td><strong>Error Rate:</strong></td>
                            <td>{$summary['error_rate']}</td>
                        </tr>
                        <tr>
                            <td><strong>Device:</strong></td>
                            <td>{$summary['device']}</td>
                        </tr>
                    </table>
                </div>

                <div style="padding: 15px; background: #f5f5f5; border-radius: 5px;">
                    <h3>Security Events</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td><strong>Rate Limit Hits:</strong></td>
                            <td>{$summary['rate_limit_hits']}</td>
                        </tr>
                        <tr>
                            <td><strong>Auth Failures:</strong></td>
                            <td>{$summary['auth_failures']}</td>
                        </tr>
                        <tr>
                            <td><strong>Models Loaded:</strong></td>
                            <td>{$summary['models_loaded']}/4</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div style="padding: 15px; background: #f5f5f5; border-radius: 5px; margin-bottom: 20px;">
                <h3>Model Status</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #ddd;">
                        <th style="text-align: left; padding: 8px;">Model</th>
                        <th style="text-align: left; padding: 8px;">Status</th>
                    </tr>
HTML;

        foreach ($health['models'] ?? [] as $model => $status) {
            $statusColor = $status === 'loaded' ? '#28a745' : '#dc3545';
            $html .= <<<HTML
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px;">$model</td>
                        <td style="padding: 8px; color: $statusColor;"><strong>$status</strong></td>
                    </tr>
HTML;
        }

        $html .= <<<HTML
                </table>
            </div>

            <div style="padding: 15px; background: #f5f5f5; border-radius: 5px;">
                <h3>Endpoint Performance</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #ddd;">
                        <th style="text-align: left; padding: 8px;">Endpoint</th>
                        <th style="text-align: right; padding: 8px;">Requests</th>
                        <th style="text-align: right; padding: 8px;">Errors</th>
                        <th style="text-align: right; padding: 8px;">Avg Time</th>
                    </tr>
HTML;

        foreach ($metrics['endpoints'] ?? [] as $endpoint => $data) {
            $html .= <<<HTML
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px;">$endpoint</td>
                        <td style="text-align: right; padding: 8px;">{$data['total_requests']}</td>
                        <td style="text-align: right; padding: 8px;">{$data['error_count']}</td>
                        <td style="text-align: right; padding: 8px;">{$data['avg_response_time_ms']}</td>
                    </tr>
HTML;
        }

        $html .= <<<HTML
                </table>
            </div>

            <div style="margin-top: 20px; color: #666; font-size: 12px;">
                <p>Last Updated: {$summary['last_updated']}</p>
            </div>
        </div>

        <style>
            .status-healthy { background: #d4edda; border: 1px solid #c3e6cb; }
            .status-degraded { background: #fff3cd; border: 1px solid #ffeaa7; }
            .status-unhealthy { background: #f8d7da; border: 1px solid #f5c6cb; }
        </style>
HTML;

        return $html;
    }

    // Private helper methods

    private function makeRequest($endpoint)
    {
        $url = $this->baseURL . $endpoint;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("Request failed: $error");
        }

        if ($httpCode !== 200) {
            throw new Exception("HTTP $httpCode: Unable to fetch $endpoint");
        }

        return json_decode($response, true) ?? [];
    }

    private function isCached($key)
    {
        if (!isset($this->cache[$key])) {
            return false;
        }

        $age = time() - $this->cache[$key]['timestamp'];
        return $age < $this->cache_ttl;
    }

    private function getFromCache($key)
    {
        return $this->cache[$key]['data'] ?? null;
    }

    private function setCache($key, $data)
    {
        $this->cache[$key] = [
            'data' => $data,
            'timestamp' => time()
        ];
    }

    private function calculateErrorRate($metrics)
    {
        $total = $metrics['total_requests'] ?? 0;
        if ($total === 0) {
            return '0.00%';
        }

        $errors = $metrics['total_errors'] ?? 0;
        return sprintf('%.2f%%', ($errors / $total) * 100);
    }

    private function countLoadedModels($health)
    {
        $count = 0;
        foreach ($health['models'] ?? [] as $status) {
            if ($status === 'loaded') {
                $count++;
            }
        }
        return $count;
    }

    private function formatUptime($seconds)
    {
        if ($seconds < 60) {
            return sprintf('%ds', $seconds);
        } elseif ($seconds < 3600) {
            return sprintf('%dm %ds', intval($seconds / 60), $seconds % 60);
        } elseif ($seconds < 86400) {
            $hours = intval($seconds / 3600);
            $minutes = intval(($seconds % 3600) / 60);
            return sprintf('%dh %dm', $hours, $minutes);
        } else {
            $days = intval($seconds / 86400);
            $hours = intval(($seconds % 86400) / 3600);
            return sprintf('%dd %dh', $days, $hours);
        }
    }
}
?>
