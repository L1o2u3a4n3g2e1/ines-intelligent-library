# AI Service API - Developer Guide

**Version:** 1.0.0  
**Last Updated:** May 23, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [API Endpoints](#api-endpoints)
4. [Authentication](#authentication)
5. [Request/Response Format](#requestresponse-format)
6. [Code Examples](#code-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Rate Limits & Quotas](#rate-limits--quotas)

---

## Overview

The AI Service API provides access to advanced artificial intelligence models for:

- **Speech Recognition** (Kinyarwanda & English)
- **Text Translation** (Bidirectional: EN↔RW)
- **Speech Synthesis** (Kinyarwanda & English)
- **Combined Workflows** (STT → Translation)

### Service Architecture

```
Your Application
       ↓
XAMPP Server (Port 80)
       ↓
AI Service API (ai.php)
       ↓
FastAPI Microservice (Port 8000)
       ↓
Machine Learning Models
```

### Supported Languages

| Language | Code | STT | TTS | Translation |
|----------|------|-----|-----|-------------|
| English | `en` | ✅* | ✅ | ✅ |
| Kinyarwanda | `rw` | ✅* | ✅ | ✅ |

*STT requires FFmpeg installation

---

## Getting Started

### Prerequisites

- XAMPP running (Apache on Port 80)
- FastAPI service running on Port 8000
- PHP 7.2 or higher
- cURL extension enabled (default in XAMPP)

### Quick Test

```bash
# Check if service is available
curl http://localhost/api/ai.php?action=ai-health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ready",
    "device": "cpu",
    "models": {
      "rw_stt": "loaded",
      "en_stt": "loaded",
      "rw_tts": "loaded",
      "en_tts": "loaded"
    }
  }
}
```

---

## API Endpoints

### 1. Health Check

**Endpoint:** `GET /api/ai.php?action=ai-health`

**Purpose:** Verify service is running and models are loaded

**Request:**
```bash
GET /api/ai.php?action=ai-health HTTP/1.1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "ready",
    "device": "cpu",
    "models": {
      "rw_stt": "loaded",
      "en_stt": "loaded",
      "rw_tts": "loaded",
      "en_tts": "loaded"
    }
  }
}
```

**Use Cases:**
- Initial health check
- Service monitoring
- Diagnostics

---

### 2. Text Translation

**Endpoint:** `POST /api/ai.php?action=ai-translate`

**Purpose:** Translate text between English and Kinyarwanda

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "Hello, how are you?",
  "direction": "en-rw"
}
```

**Direction Values:**
- `en-rw` - English to Kinyarwanda
- `rw-en` - Kinyarwanda to English

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "direction": "en-rw",
    "input": "Hello, how are you?",
    "translation": "Mu by'ukuri se, uri muntu ki?"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Text cannot be empty"
}
```

**Use Cases:**
- Live chat translation
- Document translation
- Multilingual content

---

### 3. Kinyarwanda Text-to-Speech

**Endpoint:** `POST /api/ai.php?action=ai-tts-rw`

**Purpose:** Generate Kinyarwanda speech audio from text

**Request:**
```json
{
  "text": "Ijambo ry'ubwire"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "language": "rw",
    "audio_file": "outputs/abc123def456_rw.wav",
    "text": "Ijambo ry'ubwire"
  }
}
```

**Audio Details:**
- Format: WAV
- Bitrate: 16-bit PCM
- Sample Rate: 22,050 Hz
- Duration: Varies with text length

**Use Cases:**
- Accessibility features
- Audio content generation
- Language learning

---

### 4. English Text-to-Speech

**Endpoint:** `POST /api/ai.php?action=ai-tts-en`

**Purpose:** Generate English speech audio from text

**Request:**
```json
{
  "text": "Hello world"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "language": "en",
    "audio_file": "outputs/xyz789uvw012_en.wav",
    "text": "Hello world"
  }
}
```

---

### 5. Speech-to-Text Transcription

**Endpoint:** `POST /api/ai.php?action=ai-stt`

**Purpose:** Convert audio to text

**Requirements:** FFmpeg must be installed

**Request (multipart/form-data):**
```
POST /api/ai.php?action=ai-stt HTTP/1.1
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="audio"; filename="audio.wav"
Content-Type: audio/wav

[binary audio data]

--boundary
Content-Disposition: form-data; name="language"

en
--boundary--
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "language": "en",
    "text": "Hello, how are you?"
  }
}
```

**Supported Audio Formats:**
- WAV (.wav)
- MP3 (.mp3)
- OGG (.ogg)
- FLAC (.flac)

**Max File Size:** 50 MB

---

### 6. Full Pipeline (STT → Translation)

**Endpoint:** `POST /api/ai.php?action=ai-pipeline`

**Purpose:** Transcribe audio and translate to target language

**Request:**
```
POST /api/ai.php?action=ai-pipeline HTTP/1.1
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="audio"; filename="audio.wav"
[binary data]

--boundary
Content-Disposition: form-data; name="source_language"

en
--boundary
Content-Disposition: form-data; name="target_language"

rw
--boundary--
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "source_language": "en",
    "target_language": "rw",
    "recognized_text": "Hello, how are you?",
    "translated_text": "Mu by'ukuri se, uri muntu ki?"
  }
}
```

---

## Authentication

### Current Implementation
No authentication required (development/internal use)

### Recommended for Production

Add API key header:
```
X-API-Key: your-api-key-here
```

---

## Request/Response Format

### Standard Request Format

All requests follow this pattern:

```
POST /api/ai.php?action=<endpoint> HTTP/1.1
Host: localhost
Content-Type: application/json

{
  "parameter1": "value1",
  "parameter2": "value2"
}
```

### Standard Response Format

Success:
```json
{
  "success": true,
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request processed successfully |
| 400 | Bad Request | Invalid parameters |
| 404 | Not Found | Unknown endpoint |
| 405 | Method Not Allowed | GET instead of POST |
| 500 | Server Error | Processing error |
| 503 | Unavailable | FastAPI service not running |

---

## Code Examples

### JavaScript/React

```javascript
// Translation Example
async function translateText(text, direction = 'en-rw') {
  const response = await fetch('/api/ai.php?action=ai-translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      direction: direction
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('Translation:', result.data.translation);
  } else {
    console.error('Error:', result.error);
  }
}

// Text-to-Speech Example
async function generateSpeech(text, language = 'en') {
  const endpoint = language === 'rw' ? 'ai-tts-rw' : 'ai-tts-en';
  
  const response = await fetch(`/api/ai.php?action=${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: text })
  });

  const result = await response.json();
  
  if (result.success) {
    const audioUrl = '/' + result.data.audio_file;
    const audio = new Audio(audioUrl);
    audio.play();
  }
}

// Health Check
async function checkServiceHealth() {
  const response = await fetch('/api/ai.php?action=ai-health');
  const result = await response.json();
  
  if (result.data.status === 'ready') {
    console.log('Service is ready!');
  }
}
```

### PHP

```php
<?php
require_once 'api-lib/services/AIService.php';

$ai = new AIService();

// Check health
$health = $ai->getHealth();
echo "Service Status: " . $health['status'];

// Translate
$translation = $ai->translateText("Hello", "en-rw");
echo "Translation: " . $translation['translation'];

// Text-to-Speech
$audio = $ai->synthesizeSpeechEN("Hello world");
echo "Audio: " . $audio['audio_file'];
```

### Python/Requests

```python
import requests
import json

BASE_URL = 'http://localhost/api/ai.php'

def translate_text(text, direction='en-rw'):
    response = requests.post(
        BASE_URL + '?action=ai-translate',
        json={'text': text, 'direction': direction}
    )
    return response.json()

def generate_speech(text, language='en'):
    action = 'ai-tts-rw' if language == 'rw' else 'ai-tts-en'
    response = requests.post(
        BASE_URL + f'?action={action}',
        json={'text': text}
    )
    return response.json()

# Usage
result = translate_text("How are you?", "en-rw")
print(result['data']['translation'])
```

---

## Error Handling

### Common Errors

**Empty Text:**
```json
{
  "success": false,
  "error": "Text cannot be empty"
}
```

**Invalid Language:**
```json
{
  "success": false,
  "error": "Invalid language. Must be 'en' or 'rw'"
}
```

**Service Unavailable:**
```json
{
  "success": false,
  "error": "AI Service not available"
}
```

### Error Handling Best Practices

```javascript
async function safeAPICall(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      console.error('API Error:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Network Error:', error);
    // Show user-friendly message
    showNotification('Service temporarily unavailable');
    return null;
  }
}
```

---

## Best Practices

### 1. Error Handling
- Always check `success` field in response
- Implement retry logic for transient failures
- Show user-friendly error messages

### 2. Performance
- Cache translations for repeated phrases
- Use async/await for non-blocking calls
- Batch requests when possible

### 3. Security
- Never expose API keys in client code
- Validate user input before sending
- Use HTTPS in production

### 4. Rate Limiting (when implemented)
- Implement exponential backoff
- Cache results to reduce API calls
- Queue requests for batch processing

### 5. UX/UI Considerations
- Show loading spinners during API calls
- Provide real-time feedback
- Handle offline scenarios gracefully

---

## Troubleshooting

### Service Returns 503 (Unavailable)

**Solution:**
```bash
# Check if FastAPI is running
curl http://localhost:8000/health

# If not running, start it:
cd c:\xampp\htdocs\digital-library\pretrained_ai_models
.\venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

### Translation Returns Empty String

**Cause:** Model still loading on first use  
**Solution:** Retry after 30-60 seconds (models are cached)

### Audio File Not Found

**Cause:** File path format issue  
**Solution:** Check audio file is in `outputs/` directory

### Request Timeout

**Cause:** Large audio file or slow network  
**Solution:** Increase timeout, split into smaller chunks

### CORS Error in Browser

**Solution:** Ensure request is from localhost or adjust CORS headers

---

## Rate Limits & Quotas

### Current Limits (Development)
- No enforced limits
- Recommended: Monitor for abuse

### Recommended Production Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Health Check | 1000/hour | Hourly |
| Translation | 100/hour | Hourly |
| TTS | 50/hour | Hourly |
| STT | 10/hour | Hourly |
| Pipeline | 10/hour | Hourly |

### Quota Management

```javascript
// Simple client-side rate limiting
const apiQuota = {
  translation: { used: 0, limit: 100, reset: Date.now() + 3600000 },
  
  canMakeRequest(endpoint) {
    if (Date.now() > this[endpoint].reset) {
      this[endpoint].used = 0;
      this[endpoint].reset = Date.now() + 3600000;
    }
    return this[endpoint].used < this[endpoint].limit;
  },
  
  recordRequest(endpoint) {
    this[endpoint].used++;
  }
};
```

---

## Support & Contact

For issues or questions:

1. **Check the Health Endpoint** - Verify service is running
2. **Review Logs** - Check `server.log` for errors
3. **Read Documentation** - This guide has most answers
4. **Test with cURL** - Isolate client-side issues

---

## Changelog

### Version 1.0.0 (May 23, 2026)
- Initial release
- All 6 endpoints functional
- Comprehensive documentation
- Integration tests passing

---

## License & Usage Terms

This API is provided for the Digital Library project.
- Internal use only
- Not for public distribution
- No warranty provided

---

**For more information, see:**
- [Phase 4 Integration Guide](PHASE4_PHP_INTEGRATION.md)
- [Security Audit](PHASE5_SECURITY_AUDIT.md)
- [Implementation Plan](IMPLEMENTATION_PLAN_XAMPP.md)

