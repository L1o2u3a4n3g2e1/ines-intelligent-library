#!/usr/bin/env python3
"""
Monitoring Service for Digital Library AI
Tracks performance metrics, error rates, and system health
"""

import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict, deque
from typing import Dict, List, Optional
import threading

class MetricsCollector:
    """Collect and aggregate application metrics"""

    def __init__(self, max_history=1000):
        self.max_history = max_history
        self.endpoint_metrics = defaultdict(lambda: {
            'requests': 0,
            'errors': 0,
            'rate_limited': 0,
            'total_time': 0.0,
            'response_times': deque(maxlen=max_history),
            'last_error': None,
            'last_error_time': None,
            'cache_hits': 0,
            'cache_misses': 0
        })
        self.error_log = deque(maxlen=max_history)
        self.rate_limit_log = deque(maxlen=max_history)
        self.auth_failures = deque(maxlen=100)
        self.startup_time = datetime.now()
        self.lock = threading.RLock()

    def record_request(self, endpoint: str, status_code: int, response_time: float):
        """Record an API request"""
        with self.lock:
            metrics = self.endpoint_metrics[endpoint]
            metrics['requests'] += 1
            metrics['total_time'] += response_time
            metrics['response_times'].append(response_time)

            if status_code >= 500:
                metrics['errors'] += 1
                metrics['last_error'] = f"HTTP {status_code}"
                metrics['last_error_time'] = datetime.now().isoformat()
            elif status_code == 429:
                metrics['rate_limited'] += 1

    def record_error(self, endpoint: str, error_type: str, message: str):
        """Record an error"""
        with self.lock:
            error_entry = {
                'timestamp': datetime.now().isoformat(),
                'endpoint': endpoint,
                'type': error_type,
                'message': message
            }
            self.error_log.append(error_entry)
            self.endpoint_metrics[endpoint]['last_error'] = error_type
            self.endpoint_metrics[endpoint]['last_error_time'] = error_entry['timestamp']

    def record_rate_limit_hit(self, endpoint: str, client_ip: str):
        """Record rate limit enforcement"""
        with self.lock:
            rate_limit_entry = {
                'timestamp': datetime.now().isoformat(),
                'endpoint': endpoint,
                'client_ip': client_ip
            }
            self.rate_limit_log.append(rate_limit_entry)
            self.endpoint_metrics[endpoint]['rate_limited'] += 1

    def record_auth_failure(self, reason: str, client_ip: str):
        """Record authentication failure"""
        with self.lock:
            auth_entry = {
                'timestamp': datetime.now().isoformat(),
                'reason': reason,
                'client_ip': client_ip
            }
            self.auth_failures.append(auth_entry)

    def record_cache_hit(self, endpoint: str):
        """Record cache hit"""
        with self.lock:
            self.endpoint_metrics[endpoint]['cache_hits'] += 1

    def record_cache_miss(self, endpoint: str):
        """Record cache miss"""
        with self.lock:
            self.endpoint_metrics[endpoint]['cache_misses'] += 1

    def get_metrics_summary(self) -> Dict:
        """Get current metrics summary"""
        with self.lock:
            uptime = datetime.now() - self.startup_time
            summary = {
                'timestamp': datetime.now().isoformat(),
                'uptime_seconds': int(uptime.total_seconds()),
                'uptime_formatted': str(uptime).split('.')[0],
                'endpoints': {}
            }

            for endpoint, metrics in self.endpoint_metrics.items():
                if metrics['response_times']:
                    avg_time = metrics['total_time'] / metrics['requests'] if metrics['requests'] > 0 else 0
                    response_times = list(metrics['response_times'])
                    response_times.sort()

                    cache_total = metrics['cache_hits'] + metrics['cache_misses']
                    cache_hit_rate = f"{(metrics['cache_hits'] / cache_total * 100):.1f}%" if cache_total > 0 else "0%"

                    summary['endpoints'][endpoint] = {
                        'total_requests': metrics['requests'],
                        'error_count': metrics['errors'],
                        'rate_limited_count': metrics['rate_limited'],
                        'error_rate': f"{(metrics['errors'] / metrics['requests'] * 100):.2f}%" if metrics['requests'] > 0 else "0%",
                        'avg_response_time_ms': f"{avg_time*1000:.2f}",
                        'p50_response_time_ms': f"{response_times[len(response_times)//2]*1000:.2f}" if response_times else "N/A",
                        'p95_response_time_ms': f"{response_times[int(len(response_times)*0.95)]*1000:.2f}" if response_times else "N/A",
                        'p99_response_time_ms': f"{response_times[int(len(response_times)*0.99)]*1000:.2f}" if response_times else "N/A",
                        'cache_hits': metrics['cache_hits'],
                        'cache_misses': metrics['cache_misses'],
                        'cache_hit_rate': cache_hit_rate,
                        'last_error': metrics['last_error'],
                        'last_error_time': metrics['last_error_time']
                    }

            summary['total_requests'] = sum(m['requests'] for m in self.endpoint_metrics.values())
            summary['total_errors'] = sum(m['errors'] for m in self.endpoint_metrics.values())
            summary['total_rate_limits'] = sum(m['rate_limited'] for m in self.endpoint_metrics.values())
            summary['auth_failures'] = len(self.auth_failures)

            return summary

    def get_recent_errors(self, limit: int = 20) -> List[Dict]:
        """Get recent errors"""
        with self.lock:
            return list(reversed(list(self.error_log)))[:limit]

    def get_recent_rate_limits(self, limit: int = 20) -> List[Dict]:
        """Get recent rate limit hits"""
        with self.lock:
            return list(reversed(list(self.rate_limit_log)))[:limit]

    def get_auth_failures(self, limit: int = 20) -> List[Dict]:
        """Get recent authentication failures"""
        with self.lock:
            return list(reversed(list(self.auth_failures)))[:limit]

    def get_health_status(self, model_status: Dict) -> Dict:
        """Get overall health status"""
        total_reqs = sum(m['requests'] for m in self.endpoint_metrics.values())
        total_errors = sum(m['errors'] for m in self.endpoint_metrics.values())
        error_rate = (total_errors / total_reqs * 100) if total_reqs > 0 else 0

        # Determine health status based on metrics
        if error_rate > 5:
            health = 'unhealthy'
        elif error_rate > 1:
            health = 'degraded'
        else:
            health = 'healthy'

        return {
            'status': health,
            'error_rate': f"{error_rate:.2f}%",
            'total_requests': total_reqs,
            'total_errors': total_errors,
            'models': model_status,
            'uptime': str(datetime.now() - self.startup_time).split('.')[0]
        }


class LogRotationHandler(logging.Handler):
    """Custom handler for rotating log files"""

    def __init__(self, log_dir: str = "logs", max_bytes: int = 10485760, backup_count: int = 5):
        super().__init__()
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        self.log_file = self.log_dir / "app.log"
        self.max_bytes = max_bytes
        self.backup_count = backup_count
        self.current_file = open(self.log_file, 'a')

    def emit(self, record):
        """Emit a log record"""
        try:
            msg = self.format(record)
            self.current_file.write(msg + '\n')
            self.current_file.flush()

            # Check if rotation needed
            if self.current_file.tell() > self.max_bytes:
                self.rotate()
        except Exception:
            self.handleError(record)

    def rotate(self):
        """Rotate log file"""
        self.current_file.close()

        # Shift existing backups
        for i in range(self.backup_count - 1, 0, -1):
            old_file = self.log_dir / f"app.log.{i}"
            new_file = self.log_dir / f"app.log.{i+1}"
            if old_file.exists():
                old_file.rename(new_file)

        # Rename current log
        backup_file = self.log_dir / "app.log.1"
        self.log_file.rename(backup_file)

        # Create new log file
        self.current_file = open(self.log_file, 'a')


def setup_logging(app_name: str = "digital-library-ai", log_level: int = logging.INFO):
    """Setup logging configuration"""
    logger = logging.getLogger(app_name)
    logger.setLevel(log_level)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)-8s %(name)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)

    # File handler with rotation
    file_handler = LogRotationHandler(log_dir="logs", max_bytes=10485760, backup_count=5)
    file_handler.setLevel(log_level)
    file_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)-8s %(name)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)

    # Add handlers
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger
