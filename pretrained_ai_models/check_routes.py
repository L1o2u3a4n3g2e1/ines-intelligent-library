import sys
sys.path.insert(0, '.')

# Import the app
try:
    from app import app, metrics_collector
    
    print(f"metrics_collector exists: {metrics_collector is not None}")
    print(f"metrics_collector type: {type(metrics_collector)}")
    
    print("\nAll routes:")
    for route in app.routes:
        if hasattr(route, 'path'):
            print(f"  {route.path}")
    
    print("\nMonitoring routes:")
    monitoring = [r.path for r in app.routes if hasattr(r, 'path') and any(x in r.path for x in ['metrics', 'errors', 'rate-limit', 'auth-fail'])]
    if monitoring:
        for m in monitoring:
            print(f"  {m}")
    else:
        print("  NOT FOUND")
        
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
