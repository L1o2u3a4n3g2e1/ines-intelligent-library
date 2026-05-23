<?php
/**
 * Monitoring Status Page
 * Display live monitoring data for Digital Library AI Service
 */

require_once 'api-lib/services/MonitoringService.php';

$monitoring = new MonitoringService('http://127.0.0.1:8000');

// Get data
$summary = $monitoring->getSummary();
$health = $monitoring->getHealth();
$metrics = $monitoring->getMetrics();
$errors = $monitoring->getRecentErrors(10);
$rateLimits = $monitoring->getRateLimitEvents(10);

// Set content type
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digital Library AI - Service Monitoring</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 5px;
            font-size: 1em;
        }

        .status-healthy {
            background: #10b981;
            color: white;
        }

        .status-degraded {
            background: #f59e0b;
            color: white;
        }

        .status-unhealthy {
            background: #ef4444;
            color: white;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            padding: 20px;
        }

        .card h2 {
            color: #667eea;
            font-size: 1.3em;
            margin-bottom: 15px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }

        .metric:last-child {
            border-bottom: none;
        }

        .metric-label {
            color: #666;
            font-weight: 500;
        }

        .metric-value {
            color: #333;
            font-weight: bold;
        }

        .metric-value.good {
            color: #10b981;
        }

        .metric-value.warning {
            color: #f59e0b;
        }

        .metric-value.bad {
            color: #ef4444;
        }

        .models-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }

        .model-item {
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            font-weight: 500;
        }

        .model-item.loaded {
            background: #d1fae5;
            color: #065f46;
        }

        .model-item.failed {
            background: #fee2e2;
            color: #7f1d1d;
        }

        .endpoint-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .endpoint-table th {
            background: #f3f4f6;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #e5e7eb;
        }

        .endpoint-table td {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
        }

        .endpoint-table tr:hover {
            background: #f9fafb;
        }

        .error-list {
            max-height: 300px;
            overflow-y: auto;
        }

        .error-item {
            padding: 10px;
            background: #fef2f2;
            border-left: 3px solid #ef4444;
            margin: 5px 0;
            border-radius: 3px;
            font-size: 0.9em;
        }

        .error-item .time {
            color: #999;
            font-size: 0.85em;
        }

        .error-item .type {
            color: #ef4444;
            font-weight: bold;
        }

        .refresh-info {
            text-align: center;
            color: #999;
            font-size: 0.9em;
            margin-top: 20px;
            padding: 10px;
        }

        .refresh-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            border: none;
            font-size: 0.9em;
            margin-left: 10px;
            text-decoration: none;
        }

        .refresh-button:hover {
            background: #764ba2;
        }

        .full-width {
            grid-column: 1 / -1;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }

            .models-grid {
                grid-template-columns: 1fr;
            }

            .endpoint-table th,
            .endpoint-table td {
                padding: 8px 5px;
                font-size: 0.9em;
            }
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }

        .updating {
            animation: pulse 1s infinite;
        }
    </style>
    <meta http-equiv="refresh" content="30">
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>📊 Digital Library AI Service</h1>
            <p>Real-time Monitoring Dashboard</p>
            <div>
                <span class="status-badge status-<?= str_replace('%', '', $summary['health_check']) ?>">
                    Status: <?= ucfirst($summary['health_check']) ?>
                </span>
                <span class="status-badge" style="background: #3b82f6; color: white;">
                    Uptime: <?= $summary['uptime_formatted'] ?>
                </span>
            </div>
        </div>

        <!-- Main Grid -->
        <div class="grid">
            <!-- Service Metrics Card -->
            <div class="card">
                <h2>📈 Service Metrics</h2>
                <div class="metric">
                    <span class="metric-label">Total Requests</span>
                    <span class="metric-value"><?= number_format($summary['total_requests']) ?></span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Errors</span>
                    <span class="metric-value <?= $summary['total_errors'] > 0 ? 'warning' : 'good' ?>">
                        <?= number_format($summary['total_errors']) ?>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Error Rate</span>
                    <span class="metric-value <?= strval($summary['error_rate']) > '5%' ? 'bad' : (strval($summary['error_rate']) > '1%' ? 'warning' : 'good') ?>">
                        <?= $summary['error_rate'] ?>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Device</span>
                    <span class="metric-value"><?= ucfirst($summary['device']) ?></span>
                </div>
            </div>

            <!-- Security Card -->
            <div class="card">
                <h2>🔒 Security Events</h2>
                <div class="metric">
                    <span class="metric-label">Rate Limit Hits</span>
                    <span class="metric-value <?= $summary['rate_limit_hits'] > 0 ? 'warning' : 'good' ?>">
                        <?= number_format($summary['rate_limit_hits']) ?>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Auth Failures</span>
                    <span class="metric-value <?= $summary['auth_failures'] > 0 ? 'warning' : 'good' ?>">
                        <?= number_format($summary['auth_failures']) ?>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Models Loaded</span>
                    <span class="metric-value good"><?= $summary['models_loaded'] ?>/4</span>
                </div>
            </div>

            <!-- Models Card -->
            <div class="card">
                <h2>🤖 Model Status</h2>
                <div class="models-grid">
                    <?php foreach ($health['models'] ?? [] as $model => $status): ?>
                        <div class="model-item <?= $status === 'loaded' ? 'loaded' : 'failed' ?>">
                            <div><?= str_replace('_', ' ', $model) ?></div>
                            <div style="font-size: 0.9em;"><?= ucfirst($status) ?></div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Endpoint Performance Card -->
            <div class="card full-width">
                <h2>🔌 Endpoint Performance</h2>
                <table class="endpoint-table">
                    <thead>
                        <tr>
                            <th>Endpoint</th>
                            <th>Requests</th>
                            <th>Errors</th>
                            <th>Error Rate</th>
                            <th>Avg Time</th>
                            <th>P95 Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($metrics['endpoints'] ?? [] as $endpoint => $data): ?>
                            <tr>
                                <td><strong><?= htmlspecialchars($endpoint) ?></strong></td>
                                <td><?= number_format($data['total_requests']) ?></td>
                                <td>
                                    <span class="metric-value <?= $data['error_count'] > 0 ? 'warning' : 'good' ?>">
                                        <?= number_format($data['error_count']) ?>
                                    </span>
                                </td>
                                <td><?= htmlspecialchars($data['error_rate']) ?></td>
                                <td><?= htmlspecialchars($data['avg_response_time_ms']) ?></td>
                                <td><?= htmlspecialchars($data['p95_response_time_ms']) ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <!-- Recent Errors Card -->
            <div class="card full-width">
                <h2>⚠️ Recent Errors (Last 10)</h2>
                <?php if (!empty($errors['errors'])): ?>
                    <div class="error-list">
                        <?php foreach ($errors['errors'] as $error): ?>
                            <div class="error-item">
                                <div><span class="type"><?= htmlspecialchars($error['type']) ?></span> on <?= htmlspecialchars($error['endpoint']) ?></div>
                                <div><?= htmlspecialchars($error['message']) ?></div>
                                <div class="time"><?= htmlspecialchars(substr($error['timestamp'], 11, 8)) ?></div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php else: ?>
                    <p style="color: #10b981; font-weight: 500;">✓ No errors in recent history</p>
                <?php endif; ?>
            </div>
        </div>

        <!-- Footer -->
        <div class="refresh-info">
            <p>Last updated: <?= date('Y-m-d H:i:s') ?></p>
            <p>Page auto-refreshes every 30 seconds</p>
            <a href="?" class="refresh-button">Refresh Now</a>
        </div>
    </div>
</body>
</html>
