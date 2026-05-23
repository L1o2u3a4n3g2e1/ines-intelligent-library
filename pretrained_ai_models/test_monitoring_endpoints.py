#!/usr/bin/env python3
"""
Test if monitoring endpoints can be created and registered
"""

from fastapi import FastAPI, Request
from monitoring_service import MetricsCollector

app = FastAPI(title="Test Monitoring")
metrics_collector = MetricsCollector()

@app.get("/test-health")
async def test_health():
    return {"status": "ok"}

@app.get("/test-metrics")
async def test_metrics(request: Request):
    """Test metrics endpoint"""
    return metrics_collector.get_metrics_summary()

@app.get("/test-errors")
async def test_errors(request: Request):
    """Test errors endpoint"""
    return {"errors": metrics_collector.get_recent_errors(10)}

if __name__ == "__main__":
    import uvicorn

    print("Testing monitoring endpoints...")
    print("\nRoutes registered:")
    for route in app.routes:
        print(f"  {route.path}")

    print("\nStarting test server on http://127.0.0.1:8001")
    uvicorn.run(app, host="127.0.0.1", port=8001)
