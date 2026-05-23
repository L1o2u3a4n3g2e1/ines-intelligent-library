# Digital Library AI Service - API Documentation
**Version:** 2.0.0-secure  
**Date:** May 23, 2026  
**Status:** Production Ready  

---

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Examples](#examples)

---

## Overview

### Base URL
```
http://127.0.0.1:8000
```

### Features
- Speech-to-Text (English & Kinyarwanda)
- Text Translation (EN ↔ RW)
- Text-to-Speech (English & Kinyarwanda)
- Full STT→Translation pipeline
- JWT-based authentication
- Per-endpoint rate limiting
- CORS security hardening

### Supported Languages
- **English:** en
- **Kinyarwanda:** rw

---

## Authentication

### Overview
All endpoints except `/health` and `/token` require JWT authentication.

### Getting a Token

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/token
```

**Response:**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### Using the Token

**Authorization Header:**
```bash
Authorization: Bearer <access_token>
```

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/translate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "text=hello&direction=en-rw"
```

### Token Refresh
- Tokens expire after 24 hours
- PHP client auto-refreshes with 5-minute buffer
- Manual refresh: Get new token when 401 Unauthorized received

---

## Endpoints

### 1. Health Check (No Auth)
**GET** `/health`

Returns service status and loaded models.

**Request:**
```bash
curl http://127.0.0.1:8000/health
```

**Response:**
```json
{
  "status": "ready",
  "device": "cpu",
  "models": {
    "rw_stt": "loaded",
    "en_stt": "loaded",
    "rw_tts": "loaded",
    "en_tts": "loaded"
  }
}
```

**Rate Limit:** 100/minute

---

### 2. Generate Token (No Auth)
**POST** `/token`

Generates JWT authentication token.

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/token
```

**Response:**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Rate Limit:** 10/minute

---

### 3. Speech-to-Text (Requires Auth)
**POST** `/stt`

Transcribe audio file to text.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| audio | file | Yes | Audio file (.wav, .mp3, .ogg, .flac) |
| language | string | Yes | Language code: 'en' or 'rw' |

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/stt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@audio.wav" \
  -F "language=en"
```

**Response:**
```json
{
  "success": true,
  "text": "hello world",
  "language": "en",
  "confidence": 0.95,
  "all_commands": [...]
}
```

**Rate Limit:** 10/hour  
**Error Codes:**
- 401: Unauthorized (invalid token)
- 400: Bad request (missing file or language)
- 422: Unprocessable entity (invalid audio format)
- 429: Too many requests (rate limit exceeded)
- 500: Server error (FFmpeg or model issue)

---

### 4. Translate Text (Requires Auth)
**POST** `/translate`

Translate text between English and Kinyarwanda.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | Yes | Text to translate |
| direction | string | Yes | Translation direction: 'en-rw' or 'rw-en' |

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/translate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "text=hello world&direction=en-rw"
```

**Response:**
```json
{
  "success": true,
  "input": "hello world",
  "translation": "muraho isi",
  "direction": "en-rw"
}
```

**Rate Limit:** 100/hour  
**Error Codes:**
- 400: Bad request (empty text or invalid direction)
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Server error

---

### 5. Text-to-Speech English (Requires Auth)
**POST** `/tts-en`

Generate English speech audio.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | Yes | Text to synthesize |

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/tts-en \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "text=hello world"
```

**Response:**
```json
{
  "success": true,
  "text": "hello world",
  "language": "en",
  "audio_file": "outputs/12345_en.wav",
  "duration": 1.2
}
```

**Rate Limit:** 50/hour  
**Output:** WAV format, 16-bit PCM, 22050 Hz

---

### 6. Text-to-Speech Kinyarwanda (Requires Auth)
**POST** `/tts-rw`

Generate Kinyarwanda speech audio.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | Yes | Text to synthesize |

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/tts-rw \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "text=muraho"
```

**Response:**
```json
{
  "success": true,
  "text": "muraho",
  "language": "rw",
  "audio_file": "outputs/12345_rw.wav",
  "duration": 0.8
}
```

**Rate Limit:** 50/hour  
**Output:** WAV format, 16-bit PCM, 22050 Hz

---

### 7. Full Pipeline (Requires Auth)
**POST** `/pipeline`

Complete STT → Translation pipeline in one request.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| audio | file | Yes | Audio file to process |
| source_language | string | Yes | Source: 'en' or 'rw' |
| target_language | string | Yes | Target: 'en' or 'rw' |

**Request:**
```bash
curl -X POST http://127.0.0.1:8000/pipeline \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@speech.wav" \
  -F "source_language=en" \
  -F "target_language=rw"
```

**Response:**
```json
{
  "success": true,
  "recognized_text": "hello world",
  "source_language": "en",
  "translated_text": "muraho isi",
  "target_language": "rw",
  "confidence": 0.92
}
```

**Rate Limit:** 10/hour  
**Process:** Audio → Transcribe → Translate → Return

---

## Error Handling

### Standard Error Response
```json
{
  "detail": "Error message",
  "error": "Error details"
}
```

### Common Status Codes
| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Request processed |
| 400 | Bad Request | Check parameters |
| 401 | Unauthorized | Get new token |
| 422 | Unprocessable | Verify data format |
| 429 | Rate Limited | Wait before retry |
| 500 | Server Error | Contact admin |

### Retry Logic
```
1. Check status code
2. If 401: Get new token and retry
3. If 429: Wait and retry (with Retry-After header)
4. If 500: Log error and notify admin
5. Max retries: 3 with exponential backoff
```

---

## Rate Limiting

### Per-Endpoint Limits
| Endpoint | Limit | Window |
|----------|-------|--------|
| /token | 10 | minute |
| /health | 100 | minute |
| /translate | 100 | hour |
| /stt | 10 | hour |
| /tts-en | 50 | hour |
| /tts-rw | 50 | hour |
| /pipeline | 10 | hour |

### Rate Limit Response
```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "detail": "Rate limit exceeded. Too many requests.",
  "retry_after": 60
}
```

### Best Practices
- Cache results when possible
- Use batch operations where available
- Implement exponential backoff for retries
- Monitor rate limit headers

---

## Examples

### PHP Integration
```php
<?php
require_once 'api-lib/services/AIService.php';

$ai = new AIService(false); // HTTP mode

// Translate
$result = $ai->translateText("Hello world", "en-rw");
echo "Translation: " . $result['translation'];

// TTS
$tts = $ai->synthesizeSpeechEN("Hello");
echo "Audio file: " . $tts['audio_file'];

// STT
$stt = $ai->transcribeAudio('/path/to/audio.wav', 'en');
echo "Text: " . $stt['text'];

// Pipeline
$pipeline = $ai->pipelineSTTTranslate('/path/to/audio.wav', 'en', 'rw');
echo "Result: " . $pipeline['translated_text'];
?>
```

### cURL Examples
```bash
# Get token
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/token | jq -r '.access_token')

# Translate
curl -X POST http://127.0.0.1:8000/translate \
  -H "Authorization: Bearer $TOKEN" \
  -d "text=hello&direction=en-rw"

# TTS
curl -X POST http://127.0.0.1:8000/tts-en \
  -H "Authorization: Bearer $TOKEN" \
  -d "text=hello world" \
  -o output.wav

# Check health
curl http://127.0.0.1:8000/health
```

### Python Example
```python
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Get token
token_response = requests.post(f"{BASE_URL}/token")
token = token_response.json()['access_token']

headers = {"Authorization": f"Bearer {token}"}

# Translate
translation = requests.post(
    f"{BASE_URL}/translate",
    headers=headers,
    data={"text": "hello", "direction": "en-rw"}
)
print(translation.json())

# TTS
tts = requests.post(
    f"{BASE_URL}/tts-en",
    headers=headers,
    data={"text": "hello world"}
)
print(tts.json())
```

---

## Support & Troubleshooting

### Common Issues

**Token Expired**
- Error: `{"detail": "Token has expired"}`
- Solution: Get new token from `/token` endpoint

**Rate Limited**
- Error: `{"detail": "Rate limit exceeded"}`
- Solution: Wait for `Retry-After` seconds

**Invalid Audio Format**
- Error: `{"detail": "Could not process audio"}`
- Solution: Use WAV, MP3, OGG, or FLAC format

**FFmpeg Not Found**
- Error: `{"detail": "ffmpeg was not found"}`
- Solution: Configure FFmpeg in environment (see admin guide)

### Debugging
1. Check `/health` endpoint first
2. Verify token is valid (less than 24 hours old)
3. Check rate limits haven't been exceeded
4. Review server logs for detailed errors
5. Contact admin if models failed to load

---

## Changelog

### v2.0.0-secure (May 23, 2026)
- JWT authentication added
- Rate limiting implemented
- CORS hardening applied
- FFmpeg integration completed
- Production-ready deployment

### v1.0.0 (Previous)
- Basic API endpoints
- No authentication
- No rate limiting

---

**For questions or issues, contact the Digital Library AI team.**
