<?php

return [
    'name' => 'INES Intelligent Digital Library',
    'env' => 'local',
    'token_ttl_hours' => 12,
    'allowed_origins' => [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4173',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:4173',
        'http://127.0.0.1:5173',
    ],
    'upload_dir' => __DIR__ . '/../uploads',
    'stt_service_url' => 'http://localhost:5001/transcribe',
];
