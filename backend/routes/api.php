<?php

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
$path = '/' . trim(preg_replace('#^' . preg_quote($scriptDir, '#') . '#', '', $uriPath), '/');
$path = $path === '/' ? '/health' : $path;
if (str_starts_with($path, '/api/')) {
    $path = substr($path, 4);
}

function pdo(): PDO
{
    return Database::connection();
}

function body(): array
{
    return Request::input();
}

function service_json_get(string $url, int $timeout = 3): ?array
{
    if (!function_exists('curl_init')) {
        return null;
    }
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => $timeout,
    ]);
    $raw = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);

    if ($raw === false || $status < 200 || $status >= 300) {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function service_upload_audio(string $url, array $file, int $timeout = 60): ?array
{
    if (!function_exists('curl_init') || empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return null;
    }
    $field = str_contains($url, '/api/') ? 'file' : 'audio';
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_POSTFIELDS => [
            $field => curl_file_create($file['tmp_name'], $file['type'] ?? 'audio/webm', $file['name'] ?? 'voice.webm'),
        ],
    ]);
    $raw = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);

    if ($raw === false || $status < 200 || $status >= 300) {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function ai_model_status(): array
{
    $transformerMetricsPath = __DIR__ . '/../../models/stt/transformer_metrics.json';
    $transformerMetrics = is_file($transformerMetricsPath) ? json_decode(file_get_contents($transformerMetricsPath), true) : null;

    $adapterMetricsPath = __DIR__ . '/../../models/stt/wav2vec2_lstm_adapter_metrics.json';
    $adapterMetrics = is_file($adapterMetricsPath) ? json_decode(file_get_contents($adapterMetricsPath), true) : null;

    return [
        [
            'name' => 'Transformer English Speech-to-Text (PRIMARY)',
            'task' => 'speech_to_text_search_primary',
            'source' => $transformerMetrics['model_path'] ?? './transformer_model',
            'status' => ($transformerMetrics['production_ready'] ?? false) ? 'ready' : 'training',
            'accuracy_note' => $transformerMetrics
                ? 'Held-out word accuracy: ' . round((float)$transformerMetrics['overall_word_accuracy_percent'], 2) .
                    '%; sentence exact accuracy: ' . round((float)$transformerMetrics['overall_sentence_exact_accuracy_percent'], 2) . '%.'
                : 'Transformer model training in progress with Wav2Vec2 base. Target: 90%+ accuracy.',
            'verified_metrics' => [
                'dataset' => $transformerMetrics['dataset'] ?? 'LibriSpeech synthetic audio',
                'epochs' => $transformerMetrics['epochs_completed'] ?? 0,
                'word_accuracy_percent' => $transformerMetrics['overall_word_accuracy_percent'] ?? null,
                'sentence_exact_accuracy_percent' => $transformerMetrics['overall_sentence_exact_accuracy_percent'] ?? null,
                'production_ready' => (bool)($transformerMetrics['production_ready'] ?? false),
            ],
        ],
        [
            'name' => 'Custom English Wav2Vec2 + BiLSTM STT (FALLBACK)',
            'task' => 'speech_to_text_search_fallback',
            'source' => $adapterMetrics['model_path'] ?? 'Training in progress',
            'status' => ($adapterMetrics['production_ready'] ?? false) ? 'ready' : 'training',
            'accuracy_note' => $adapterMetrics
                ? 'Held-out word accuracy: ' . round((float)$adapterMetrics['overall_word_accuracy_percent'], 2) .
                    '%; sentence exact accuracy: ' . round((float)$adapterMetrics['overall_sentence_exact_accuracy_percent'], 2) . '%.'
                : 'Wav2Vec2 adapter fallback. Used if primary model unavailable.',
            'verified_metrics' => [
                'dataset' => $adapterMetrics['dataset'] ?? 'LibriSpeech real audio',
                'adapter_epochs' => $adapterMetrics['adapter_trained_epochs'] ?? 0,
                'word_accuracy_percent' => $adapterMetrics['overall_word_accuracy_percent'] ?? null,
                'sentence_exact_accuracy_percent' => $adapterMetrics['overall_sentence_exact_accuracy_percent'] ?? null,
                'production_ready' => (bool)($adapterMetrics['production_ready'] ?? false),
            ],
        ],
        [
            'name' => 'Whisper English fallback STT',
            'task' => 'speech_to_text_search',
            'source' => 'OpenAI Whisper tiny.en',
            'status' => service_json_get('http://127.0.0.1:5001/health', 2) ? 'ready' : 'service_offline',
            'accuracy_note' => 'Production fallback for arbitrary English book titles and topics. A separate local five-file LibriSpeech audit measured 91.67% word accuracy; this is a smoke benchmark, not a full evaluation.',
        ],
        [
            'name' => 'Text-to-Speech',
            'task' => 'text_to_speech',
            'source' => 'Google Text-to-Speech (gTTS 2.5.1)',
            'status' => 'ready',
            'accuracy_note' => 'English narration is generated as an MP3 by the backend gTTS service.',
        ],
    ];
}

function local_open_vocabulary_transcribe(array $file): ?array
{
    if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return null;
    }

    // Try Transformer model (PRIMARY) - port 5004
    $transformerResult = service_upload_audio('http://127.0.0.1:5004/api/stt/transcribe', $file, 120);
    if ($transformerResult) {
        return $transformerResult;
    }

    // Try Wav2Vec2 + LSTM adapter (FALLBACK) - port 5003
    $adapterResult = service_upload_audio('http://127.0.0.1:5003/api/stt/transcribe?mode=open', $file, 100);
    if ($adapterResult) {
        return $adapterResult;
    }

    // Try Whisper (FINAL FALLBACK) - port 5001
    return service_upload_audio('http://127.0.0.1:5001/transcribe', $file, 90);
}

function admin_roles(): array
{
    return ['LIBRARIAN_ADMIN'];
}

function enforce_rate_limit(string $bucket, int $limit, int $windowSeconds): void
{
    $identity = ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|' . $bucket;
    $directory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ines-library-rate-limits';
    if (!is_dir($directory)) {
        @mkdir($directory, 0775, true);
    }
    $path = $directory . DIRECTORY_SEPARATOR . hash('sha256', $identity) . '.json';
    $now = time();
    $state = ['started_at' => $now, 'count' => 0];
    $handle = @fopen($path, 'c+');
    if (!$handle) {
        return;
    }
    try {
        if (!flock($handle, LOCK_EX)) {
            return;
        }
        $raw = stream_get_contents($handle);
        $stored = $raw ? json_decode($raw, true) : null;
        if (is_array($stored) && ($now - (int)($stored['started_at'] ?? 0)) < $windowSeconds) {
            $state = $stored;
        }
        $state['count'] = (int)($state['count'] ?? 0) + 1;
        if ($state['count'] > $limit) {
            $retryAfter = max(1, $windowSeconds - ($now - (int)$state['started_at']));
            header('Retry-After: ' . $retryAfter);
            Response::error('Too many requests. Please wait before trying again.', 429);
        }
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($state));
        fflush($handle);
        flock($handle, LOCK_UN);
    } finally {
        fclose($handle);
    }
}

function parse_catalog_query(string $query): array
{
    $normalized = trim(preg_replace('/\s+/', ' ', mb_strtolower($query)));
    $availability = '';
    if (preg_match('/\b(available|in stock|can borrow)\b/u', $normalized)) {
        $availability = 'available';
        $normalized = preg_replace('/\b(available|in stock|can borrow)\b/u', ' ', $normalized);
    } elseif (preg_match('/\b(unavailable|out of stock)\b/u', $normalized)) {
        $availability = 'unavailable';
        $normalized = preg_replace('/\b(unavailable|out of stock)\b/u', ' ', $normalized);
    }

    $author = '';
    if (preg_match('/\b(?:by|author)\s+([a-z][a-z .\'-]{2,})$/iu', $normalized, $match)) {
        $author = trim($match[1]);
        $normalized = trim(substr($normalized, 0, (int)strpos($normalized, $match[0])));
    }

    $stopPhrases = [
        'please', 'find', 'show', 'search', 'look for', 'give me', 'i need', 'books', 'book',
        'resources', 'resource', 'about', 'on', 'for', 'students', 'student', 'in the library',
    ];
    foreach ($stopPhrases as $phrase) {
        $normalized = preg_replace('/\b' . preg_quote($phrase, '/') . '\b/u', ' ', $normalized);
    }
    $keywords = trim(preg_replace('/\s+/', ' ', $normalized));

    return [
        'original' => trim($query),
        'keywords' => $keywords,
        'author' => $author,
        'availability' => $availability,
    ];
}

function interpret_library_action(string $transcript): ?array
{
    $normalized = mb_strtolower(trim($transcript));
    if (preg_match('/\b(open|show|go to)\b.*\b(my )?borrowed books?\b/u', $normalized)) {
        return ['type' => 'navigate', 'path' => '/student/borrowed', 'label' => 'Open my borrowed books'];
    }
    if (preg_match('/\b(open|show|go to)\b.*\b(favorites|favourite books?)\b/u', $normalized)) {
        return ['type' => 'navigate', 'path' => '/student/favorites', 'label' => 'Open favorites'];
    }
    if (preg_match('/\b(open|show|go to)\b.*\b(bookmarks?)\b/u', $normalized)) {
        return ['type' => 'navigate', 'path' => '/student/bookmarks', 'label' => 'Open bookmarks'];
    }
    if (preg_match('/\b(open|show|go to)\b.*\b(recommendations?)\b/u', $normalized)) {
        return ['type' => 'navigate', 'path' => '/recommendations', 'label' => 'Open recommendations'];
    }
    return null;
}

function book_select_sql(): string
{
    return "SELECT b.id, b.title, b.subtitle, b.isbn, b.publisher, b.publication_year, b.description, b.keywords,
            b.cover_image, b.total_copies, b.available_copies, b.status,
            a.full_name AS author, cat.name AS category, f.name AS faculty, d.name AS department, c.name AS course
            FROM books b
            LEFT JOIN authors a ON a.id = b.author_id
            LEFT JOIN categories cat ON cat.id = b.category_id
            LEFT JOIN faculties f ON f.id = b.faculty_id
            LEFT JOIN departments d ON d.id = b.department_id
            LEFT JOIN courses c ON c.id = b.course_id";
}

function book_files_for(int $bookId): array
{
    $stmt = pdo()->prepare('SELECT id, file_type, original_name, mime_type, file_size, status, created_at FROM book_files WHERE book_id=:book_id AND status="active" ORDER BY created_at DESC');
    $stmt->execute([':book_id' => $bookId]);
    return $stmt->fetchAll();
}

function classify_file_type(string $extension): string
{
    return match (strtolower($extension)) {
        'pdf' => 'pdf',
        'docx' => 'docx',
        'txt' => 'txt',
        'mp3', 'wav', 'm4a', 'ogg', 'webm' => 'audio',
        'jpg', 'jpeg', 'png', 'webp' => 'cover',
        default => 'other',
    };
}

function safe_upload_extension(string $name): string
{
    $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $allowed = ['pdf', 'docx', 'txt', 'mp3', 'wav', 'm4a', 'ogg', 'webm', 'jpg', 'jpeg', 'png', 'webp'];
    if (!in_array($extension, $allowed, true)) {
        Response::error('Unsupported file type', 422);
    }
    return $extension;
}

function run_json_command(string $command): ?array
{
    $output = [];
    $exitCode = 1;
    exec($command . ' 2>&1', $output, $exitCode);
    if ($exitCode !== 0 || !$output) {
        return null;
    }
    for ($index = count($output) - 1; $index >= 0; $index--) {
        $decoded = json_decode($output[$index], true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return null;
}

function convert_word_document_to_pdf(string $source, string $target): bool
{
    if (strtolower(pathinfo($source, PATHINFO_EXTENSION)) !== 'docx') {
        return false;
    }
    $pythonScript = realpath(__DIR__ . '/../../scripts/document_pipeline.py');
    if (!$pythonScript) {
        return false;
    }
    $command = 'python ' . escapeshellarg($pythonScript) . ' convert ' .
        escapeshellarg($source) . ' ' . escapeshellarg($target);
    $result = run_json_command($command);
    return ($result['success'] ?? false) && is_file($target) && filesize($target) > 0;
}

function extract_document_text(string $path, int $maxChars = 500000): ?array
{
    $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if (!in_array($extension, ['pdf', 'docx', 'txt'], true)) {
        return null;
    }
    $sidecar = $path . '.content.txt';
    if (is_file($sidecar)) {
        $text = trim((string)file_get_contents($sidecar));
        return [
            'text' => mb_substr($text, 0, $maxChars),
            'characters' => mb_strlen($text),
            'truncated' => mb_strlen($text) > $maxChars,
        ];
    }

    $pythonScript = realpath(__DIR__ . '/../../scripts/document_pipeline.py');
    if (!$pythonScript) {
        return null;
    }
    $command = 'python ' . escapeshellarg($pythonScript) . ' extract ' .
        escapeshellarg($path) . ' --max-chars ' . $maxChars;
    $result = run_json_command($command);
    if (!($result['success'] ?? false)) {
        return null;
    }
    $text = trim((string)($result['text'] ?? ''));
    if ($text !== '') {
        @file_put_contents($sidecar, $text);
    }
    return [
        'text' => $text,
        'characters' => (int)($result['characters'] ?? mb_strlen($text)),
        'truncated' => (bool)($result['truncated'] ?? false),
    ];
}

function generate_gtts_audio(array $user, string $text, string $language = 'en'): array
{
    $text = trim($text);
    if ($text === '') {
        Response::error('Text is required for audio narration', 422);
    }
    if (mb_strlen($text) > 3500) {
        Response::error('Narration sections must be 3,500 characters or shorter', 422);
    }
    if ($language !== 'en') {
        Response::error('Only English gTTS narration is currently enabled', 422);
    }

    $script = realpath(__DIR__ . '/../../scripts/gtts_synthesize.py');
    if (!$script) {
        Response::error('The gTTS narration service is not installed', 503);
    }

    $uploadRoot = realpath(__DIR__ . '/../uploads') ?: (__DIR__ . '/../uploads');
    $relativeDirectory = 'tts/' . (int)$user['id'];
    $targetDirectory = $uploadRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeDirectory);
    if (!is_dir($targetDirectory) && !mkdir($targetDirectory, 0775, true) && !is_dir($targetDirectory)) {
        Response::error('Could not prepare narration storage', 500);
    }

    $filename = hash('sha256', $language . '|' . $text) . '.mp3';
    $target = $targetDirectory . DIRECTORY_SEPARATOR . $filename;
    if (!is_file($target) || filesize($target) === 0) {
        $input = tempnam(sys_get_temp_dir(), 'ines-gtts-');
        if (!$input || file_put_contents($input, $text) === false) {
            Response::error('Could not prepare narration text', 500);
        }
        try {
            $command = 'python ' . escapeshellarg($script) . ' ' .
                escapeshellarg($input) . ' ' . escapeshellarg($target) . ' --lang ' . escapeshellarg($language);
            $result = run_json_command($command);
            if (!($result['success'] ?? false) || !is_file($target) || filesize($target) === 0) {
                @unlink($target);
                Response::error('gTTS could not generate this narration. Check the internet connection and try again.', 503);
            }
        } finally {
            @unlink($input);
        }
    }

    return [
        'filename' => $filename,
        'file_path' => 'uploads/' . $relativeDirectory . '/' . $filename,
        'absolute_path' => $target,
        'mime_type' => 'audio/mpeg',
        'file_size' => filesize($target),
        'provider' => 'gtts',
    ];
}

function process_uploaded_library_file(array $file, string $relativeDirectory): array
{
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        Response::error('The file upload did not complete successfully', 422);
    }
    if ((int)($file['size'] ?? 0) > 50 * 1024 * 1024) {
        Response::error('Book files must be 50 MB or smaller', 422);
    }

    $extension = safe_upload_extension($file['name'] ?? '');
    $uploadRoot = realpath(__DIR__ . '/../uploads') ?: (__DIR__ . '/../uploads');
    $normalizedDirectory = trim(str_replace(['\\', '..'], ['/', ''], $relativeDirectory), '/');
    $targetDirectory = $uploadRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $normalizedDirectory);
    if (!is_dir($targetDirectory) && !mkdir($targetDirectory, 0775, true) && !is_dir($targetDirectory)) {
        Response::error('Could not prepare upload storage', 500);
    }

    $storedName = bin2hex(random_bytes(12)) . '.' . $extension;
    $target = $targetDirectory . DIRECTORY_SEPARATOR . $storedName;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        Response::error('Could not store uploaded file', 500);
    }

    $converted = false;
    $sourceName = basename((string)($file['name'] ?? $storedName));
    $finalExtension = $extension;
    $finalTarget = $target;
    $finalName = $sourceName;
    $mimeType = $file['type'] ?? null;

    if ($extension === 'docx') {
        $pdfStoredName = pathinfo($storedName, PATHINFO_FILENAME) . '.pdf';
        $pdfTarget = $targetDirectory . DIRECTORY_SEPARATOR . $pdfStoredName;
        if (!convert_word_document_to_pdf($target, $pdfTarget)) {
            @unlink($target);
            @unlink($pdfTarget);
            Response::error('The Word document could not be converted to PDF. Check that it is a valid DOCX file.', 422);
        }
        @unlink($target);
        $storedName = $pdfStoredName;
        $finalTarget = $pdfTarget;
        $finalExtension = 'pdf';
        $finalName = pathinfo($sourceName, PATHINFO_FILENAME) . '.pdf';
        $mimeType = 'application/pdf';
        $converted = true;
    }

    if (in_array($finalExtension, ['pdf', 'txt'], true)) {
        extract_document_text($finalTarget);
    }

    return [
        'file_type' => classify_file_type($finalExtension),
        'file_path' => 'uploads/' . $normalizedDirectory . '/' . $storedName,
        'original_name' => $finalName,
        'source_name' => $sourceName,
        'mime_type' => $mimeType,
        'file_size' => filesize($finalTarget),
        'converted_to_pdf' => $converted,
        'absolute_path' => $finalTarget,
    ];
}

function resolve_stored_upload(array $file): array
{
    $absolute = realpath(__DIR__ . '/../' . $file['file_path']);
    $uploadsRoot = realpath(__DIR__ . '/../uploads');
    if (!$absolute || !$uploadsRoot || !str_starts_with(str_replace('\\', '/', $absolute), str_replace('\\', '/', $uploadsRoot))) {
        Response::error('File storage path is invalid', 404);
    }
    $file['absolute_path'] = $absolute;
    return $file;
}

function stored_book_file(int $fileId): array
{
    $stmt = pdo()->prepare('SELECT * FROM book_files WHERE id=:id AND status="active" LIMIT 1');
    $stmt->execute([':id' => $fileId]);
    $file = $stmt->fetch();
    if (!$file) {
        Response::error('File not found', 404);
    }
    return resolve_stored_upload($file);
}

function serve_stored_file(array $file, bool $inline = false): void
{
    $absolute = $file['absolute_path'];
    $size = filesize($absolute);
    $start = 0;
    $end = $size - 1;
    $status = 200;

    header('Accept-Ranges: bytes');
    if (!empty($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $matches)) {
        $requestedStart = $matches[1] !== '' ? (int)$matches[1] : 0;
        $requestedEnd = $matches[2] !== '' ? (int)$matches[2] : $end;
        if ($requestedStart <= $requestedEnd && $requestedStart < $size) {
            $start = $requestedStart;
            $end = min($requestedEnd, $end);
            $status = 206;
        }
    }

    $safeName = preg_replace('/[^A-Za-z0-9._ -]/', '_', basename($file['original_name'] ?: $absolute));
    http_response_code($status);
    header('Content-Type: ' . ($file['mime_type'] ?: 'application/octet-stream'));
    header('Content-Length: ' . (($end - $start) + 1));
    header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . '; filename="' . $safeName . '"');
    if ($status === 206) {
        header("Content-Range: bytes {$start}-{$end}/{$size}");
    }

    $handle = fopen($absolute, 'rb');
    if (!$handle) {
        Response::error('Could not read stored file', 500);
    }
    fseek($handle, $start);
    $remaining = ($end - $start) + 1;
    while ($remaining > 0 && !feof($handle)) {
        $chunk = fread($handle, min(8192, $remaining));
        if ($chunk === false) {
            break;
        }
        echo $chunk;
        $remaining -= strlen($chunk);
    }
    fclose($handle);
    exit;
}

function optional_int(mixed $value, string $label): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    return Validator::int($value, $label);
}

function bounded_int(mixed $value, int $default, int $min, int $max): int
{
    if ($value === null || $value === '') {
        return max($min, min($default, $max));
    }
    $parsed = filter_var($value, FILTER_VALIDATE_INT);
    if ($parsed === false) {
        return $default;
    }
    return max($min, min((int)$parsed, $max));
}

function fetch_book(int $id, bool $forUpdate = false): array
{
    $sql = 'SELECT * FROM books WHERE id=:id' . ($forUpdate ? ' FOR UPDATE' : '');
    $stmt = pdo()->prepare($sql);
    $stmt->execute([':id' => $id]);
    $book = $stmt->fetch();
    if (!$book) {
        Response::error('Book not found', 404);
    }
    return $book;
}

function fetch_book_submission(int $id, bool $forUpdate = false): array
{
    $sql = 'SELECT * FROM book_submissions WHERE id=:id' . ($forUpdate ? ' FOR UPDATE' : '');
    $stmt = pdo()->prepare($sql);
    $stmt->execute([':id' => $id]);
    $submission = $stmt->fetch();
    if (!$submission) {
        Response::error('Book submission not found', 404);
    }
    return $submission;
}

function fetch_personal_book(int $id, int $userId): array
{
    $stmt = pdo()->prepare(
        'SELECT * FROM personal_books WHERE id=:id AND user_id=:user_id AND status="active" LIMIT 1'
    );
    $stmt->execute([':id' => $id, ':user_id' => $userId]);
    $book = $stmt->fetch();
    if (!$book) {
        Response::error('Private book not found', 404);
    }
    return $book;
}

function delete_stored_upload(array $file): void
{
    $resolved = resolve_stored_upload($file);
    @unlink($resolved['absolute_path'] . '.content.txt');
    @unlink($resolved['absolute_path']);
}

function fetch_reading_list(int $id): array
{
    $stmt = pdo()->prepare('SELECT * FROM reading_lists WHERE id=:id AND status="active"');
    $stmt->execute([':id' => $id]);
    $list = $stmt->fetch();
    if (!$list) {
        Response::error('Reading list not found', 404);
    }
    return $list;
}

function require_reading_list_manager(array $user, array $list): void
{
    if ($user['role_code'] !== 'LIBRARIAN_ADMIN' && (int)$list['lecturer_id'] !== (int)$user['id']) {
        Response::error('You cannot manage this reading list', 403);
    }
}

function normalize_log_status(string $status): string
{
    return in_array($status, ['success', 'empty_transcript', 'failed'], true) ? $status : 'success';
}

function route(string $method, string $path): void
{
    if ($method === 'GET' && $path === '/health') {
        $databaseOk = false;
        try {
            $databaseOk = pdo()->query('SELECT 1')->fetchColumn() === 1;
        } catch (Throwable) {
            $databaseOk = false;
        }
        Response::ok([
            'status' => $databaseOk ? 'ok' : 'degraded',
            'service' => 'INES backend',
            'database' => $databaseOk ? 'connected' : 'unavailable',
            'uploads_writable' => is_writable(__DIR__ . '/../uploads'),
            'timestamp' => gmdate('c'),
        ]);
    }

    if ($method === 'POST' && $path === '/auth/register') {
        $data = body();
        Validator::require($data, ['full_name', 'email', 'password']);
        Validator::email($data['email']);
        if (strlen((string)$data['password']) < 8) {
            Response::error('Password must be at least 8 characters', 422);
        }
        $email = strtolower(trim((string)$data['email']));
        $existingUser = pdo()->prepare('SELECT id FROM users WHERE email=:email LIMIT 1');
        $existingUser->execute([':email' => $email]);
        if ($existingUser->fetch()) {
            Response::error('An account with this email already exists', 409);
        }

        $roleCode = strtoupper((string)($data['role'] ?? 'STUDENT'));
        if ($roleCode === 'LIBRARIAN_ADMIN') {
            Response::error('Administrator accounts must be created by an existing administrator', 403);
        }
        $roleStmt = pdo()->prepare('SELECT id FROM roles WHERE code = :code AND status = "active"');
        $roleStmt->execute([':code' => $roleCode]);
        $role = $roleStmt->fetch();
        if (!$role) {
            Response::error('Invalid role', 422);
        }

        $stmt = pdo()->prepare(
            'INSERT INTO users (role_id, full_name, email, phone, gender, password_hash, status)
             VALUES (:role_id, :full_name, :email, :phone, :gender, :password_hash, "active")'
        );
        $stmt->execute([
            ':role_id' => $role['id'],
            ':full_name' => trim($data['full_name']),
            ':email' => $email,
            ':phone' => $data['phone'] ?? null,
            ':gender' => $data['gender'] ?? null,
            ':password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
        ]);
        $userId = (int)pdo()->lastInsertId();
        ActivityLogService::log(['id' => $userId, 'role_code' => $roleCode], 'register_user');
        Response::ok(['id' => $userId], 'User registered successfully');
    }

    if ($method === 'POST' && $path === '/auth/login') {
        enforce_rate_limit('login', 10, 300);
        $data = body();
        Validator::require($data, ['email', 'password']);
        Validator::email($data['email']);

        $stmt = pdo()->prepare(
            'SELECT u.*, r.code AS role_code, r.name AS role_name
             FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.email = :email LIMIT 1'
        );
        $stmt->execute([':email' => strtolower(trim($data['email']))]);
        $user = $stmt->fetch();
        $ok = $user && password_verify($data['password'], $user['password_hash']) && $user['status'] === 'active';

        $log = pdo()->prepare('INSERT INTO login_logs (user_id, email, ip_address, user_agent, status, failure_reason) VALUES (:user_id, :email, :ip, :ua, :status, :reason)');
        $log->execute([
            ':user_id' => $user['id'] ?? null,
            ':email' => strtolower(trim($data['email'])),
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            ':ua' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
            ':status' => $ok ? 'success' : 'failed',
            ':reason' => $ok ? null : 'Invalid credentials or inactive account',
        ]);

        if (!$ok) {
            Response::error('Invalid credentials or inactive account', 401);
        }

        $token = bin2hex(random_bytes(32));
        $app = require __DIR__ . '/../config/app.php';
        $update = pdo()->prepare('UPDATE users SET api_token_hash=:hash, token_expires_at=DATE_ADD(NOW(), INTERVAL :hours HOUR), last_login_at=NOW() WHERE id=:id');
        $update->bindValue(':hash', hash('sha256', $token));
        $update->bindValue(':hours', (int)$app['token_ttl_hours'], PDO::PARAM_INT);
        $update->bindValue(':id', (int)$user['id'], PDO::PARAM_INT);
        $update->execute();

        ActivityLogService::log($user, 'login');
        Response::ok([
            'token' => $token,
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['full_name'],
                'email' => $user['email'],
                'role' => strtolower($user['role_code']) === 'librarian_admin' ? 'librarian_admin' : strtolower($user['role_code']),
                'role_code' => $user['role_code'],
                'role_name' => $user['role_name'],
                'status' => $user['status'],
            ],
        ], 'Login successful');
    }

    if ($method === 'GET' && $path === '/auth/me') {
        Response::ok(current_user(true));
    }

    if ($method === 'POST' && $path === '/auth/logout') {
        $user = current_user(false);
        if ($user) {
            pdo()->prepare('UPDATE users SET api_token_hash=NULL, token_expires_at=NULL WHERE id=:id')->execute([':id' => $user['id']]);
            ActivityLogService::log($user, 'logout');
        }
        Response::ok(null, 'Logged out');
    }

    if ($method === 'POST' && $path === '/auth/forgot-password') {
        $data = body();
        Validator::require($data, ['email']);
        Validator::email($data['email']);
        $email = strtolower(trim($data['email']));
        $stmt = pdo()->prepare('SELECT id FROM users WHERE email=:email AND status="active" LIMIT 1');
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();
        $response = null;
        if ($user) {
            $token = bin2hex(random_bytes(32));
            $db = pdo();
            $db->beginTransaction();
            try {
                $db->prepare('UPDATE password_resets SET status="expired" WHERE user_id=:user_id AND status="active"')
                    ->execute([':user_id' => $user['id']]);
                $db->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at, status) VALUES (:user_id, :hash, DATE_ADD(NOW(), INTERVAL 1 HOUR), "active")')
                    ->execute([':user_id' => $user['id'], ':hash' => hash('sha256', $token)]);
                $db->commit();
            } catch (Throwable $error) {
                $db->rollBack();
                throw $error;
            }
            $app = require __DIR__ . '/../config/app.php';
            if (($app['env'] ?? 'production') === 'local') {
                $response = [
                    'reset_token' => $token,
                    'reset_url' => '/reset-password?token=' . rawurlencode($token) . '&email=' . rawurlencode($email),
                    'expires_in_minutes' => 60,
                ];
            }
        }
        Response::ok($response, 'If the email exists, reset instructions were created');
    }

    if ($method === 'POST' && $path === '/auth/reset-password') {
        $data = body();
        Validator::require($data, ['token', 'password']);
        if (strlen((string)$data['password']) < 8) {
            Response::error('Password must be at least 8 characters', 422);
        }
        if (isset($data['password_confirmation']) && !hash_equals((string)$data['password'], (string)$data['password_confirmation'])) {
            Response::error('Password confirmation does not match', 422);
        }

        $db = pdo();
        $db->beginTransaction();
        try {
            $stmt = $db->prepare(
                'SELECT pr.id, pr.user_id
                 FROM password_resets pr
                 JOIN users u ON u.id=pr.user_id
                 WHERE pr.token_hash=:hash AND pr.status="active" AND pr.used_at IS NULL
                   AND pr.expires_at > NOW() AND u.status="active"
                 LIMIT 1 FOR UPDATE'
            );
            $stmt->execute([':hash' => hash('sha256', trim((string)$data['token']))]);
            $reset = $stmt->fetch();
            if (!$reset) {
                $db->rollBack();
                Response::error('This reset link is invalid or has expired', 422);
            }
            $db->prepare('UPDATE users SET password_hash=:password_hash, api_token_hash=NULL, token_expires_at=NULL WHERE id=:id')
                ->execute([
                    ':password_hash' => password_hash((string)$data['password'], PASSWORD_DEFAULT),
                    ':id' => $reset['user_id'],
                ]);
            $db->prepare('UPDATE password_resets SET status="used", used_at=NOW() WHERE id=:id')
                ->execute([':id' => $reset['id']]);
            $db->prepare('UPDATE password_resets SET status="expired" WHERE user_id=:user_id AND status="active" AND id<>:id')
                ->execute([':user_id' => $reset['user_id'], ':id' => $reset['id']]);
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        }
        Response::ok(null, 'Password reset successfully. Sign in with your new password');
    }

    if ($method === 'PATCH' && $path === '/auth/password') {
        $user = current_user();
        $data = body();
        Validator::require($data, ['current_password', 'password']);
        if (strlen((string)$data['password']) < 8) {
            Response::error('Password must be at least 8 characters', 422);
        }
        $stmt = pdo()->prepare('SELECT password_hash FROM users WHERE id=:id');
        $stmt->execute([':id' => $user['id']]);
        $hash = $stmt->fetchColumn();
        if (!$hash || !password_verify((string)$data['current_password'], $hash)) {
            Response::error('Current password is incorrect', 422);
        }
        pdo()->prepare('UPDATE users SET password_hash=:hash, api_token_hash=NULL, token_expires_at=NULL WHERE id=:id')
            ->execute([':hash' => password_hash((string)$data['password'], PASSWORD_DEFAULT), ':id' => $user['id']]);
        ActivityLogService::log($user, 'password_updated');
        Response::ok(null, 'Password updated. Sign in again with the new password');
    }

    if ($method === 'GET' && $path === '/users') {
        $user = current_user();
        require_role($user, admin_roles());
        $stmt = pdo()->query('SELECT u.id, u.full_name, u.email, u.phone, u.gender, u.status, r.code AS role_code, r.name AS role_name FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.created_at DESC');
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'POST' && $path === '/users') {
        $user = current_user();
        require_role($user, admin_roles());
        $data = body();
        Validator::require($data, ['full_name', 'email', 'password', 'role_id']);
        $stmt = pdo()->prepare('INSERT INTO users (role_id, full_name, email, phone, gender, password_hash, status) VALUES (:role_id, :full_name, :email, :phone, :gender, :password_hash, :status)');
        $stmt->execute([
            ':role_id' => Validator::int($data['role_id'], 'role_id'),
            ':full_name' => $data['full_name'],
            ':email' => strtolower($data['email']),
            ':phone' => $data['phone'] ?? null,
            ':gender' => $data['gender'] ?? null,
            ':password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
            ':status' => $data['status'] ?? 'active',
        ]);
        Response::ok(['id' => (int)pdo()->lastInsertId()], 'User created');
    }

    if (preg_match('#^/users/(\d+)$#', $path, $m)) {
        $actor = current_user();
        require_role($actor, admin_roles());
        $id = Validator::int($m[1]);
        if ($method === 'GET') {
            $stmt = pdo()->prepare('SELECT u.id, u.full_name, u.email, u.phone, u.gender, u.status, r.code AS role_code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=:id');
            $stmt->execute([':id' => $id]);
            Response::ok($stmt->fetch());
        }
        if ($method === 'PUT') {
            $data = body();
            $stmt = pdo()->prepare('UPDATE users SET full_name=:full_name, phone=:phone, gender=:gender, status=:status WHERE id=:id');
            $stmt->execute([
                ':full_name' => $data['full_name'] ?? '',
                ':phone' => $data['phone'] ?? null,
                ':gender' => $data['gender'] ?? null,
                ':status' => $data['status'] ?? 'active',
                ':id' => $id,
            ]);
            Response::ok(['id' => $id], 'User updated');
        }
        if ($method === 'DELETE') {
            pdo()->prepare('UPDATE users SET status="inactive" WHERE id=:id')->execute([':id' => $id]);
            Response::ok(['id' => $id], 'User deactivated');
        }
    }

    if (preg_match('#^/users/(\d+)/(deactivate|role)$#', $path, $m) && $method === 'PATCH') {
        $actor = current_user();
        require_role($actor, admin_roles());
        $id = Validator::int($m[1]);
        $data = body();
        if ($m[2] === 'deactivate') {
            pdo()->prepare('UPDATE users SET status=:status WHERE id=:id')->execute([':status' => $data['status'] ?? 'inactive', ':id' => $id]);
        } else {
            pdo()->prepare('UPDATE users SET role_id=:role_id WHERE id=:id')->execute([':role_id' => Validator::int($data['role_id'], 'role_id'), ':id' => $id]);
        }
        Response::ok(['id' => $id], 'User updated');
    }

    if ($method === 'POST' && $path === '/book-submissions') {
        $user = current_user();
        require_role($user, ['STUDENT']);
        Validator::require($_POST, ['title']);
        if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
            Response::error('A PDF, Word, text, or audio file is required', 422);
        }
        $submissionExtension = strtolower(pathinfo((string)($_FILES['file']['name'] ?? ''), PATHINFO_EXTENSION));
        if (!in_array($submissionExtension, ['pdf', 'docx', 'txt', 'mp3', 'wav', 'm4a', 'ogg', 'webm'], true)) {
            Response::error('Student submissions must be a PDF, DOCX, TXT, or supported audio file', 422);
        }

        $asset = process_uploaded_library_file(
            $_FILES['file'],
            'submissions/' . (int)$user['id']
        );
        $totalCopies = bounded_int($_POST['total_copies'] ?? null, 1, 1, 1000000);
        $stmt = pdo()->prepare(
            'INSERT INTO book_submissions
             (submitted_by, title, isbn, publisher, publication_year, description, keywords, total_copies,
              file_type, file_path, original_name, source_name, mime_type, file_size, converted_to_pdf)
             VALUES
             (:submitted_by, :title, :isbn, :publisher, :publication_year, :description, :keywords, :total_copies,
              :file_type, :file_path, :original_name, :source_name, :mime_type, :file_size, :converted_to_pdf)'
        );
        $stmt->execute([
            ':submitted_by' => $user['id'],
            ':title' => trim((string)$_POST['title']),
            ':isbn' => trim((string)($_POST['isbn'] ?? '')) ?: null,
            ':publisher' => trim((string)($_POST['publisher'] ?? '')) ?: null,
            ':publication_year' => optional_int($_POST['publication_year'] ?? null, 'publication_year'),
            ':description' => trim((string)($_POST['description'] ?? '')) ?: null,
            ':keywords' => trim((string)($_POST['keywords'] ?? '')) ?: null,
            ':total_copies' => $totalCopies,
            ':file_type' => $asset['file_type'],
            ':file_path' => $asset['file_path'],
            ':original_name' => $asset['original_name'],
            ':source_name' => $asset['source_name'],
            ':mime_type' => $asset['mime_type'],
            ':file_size' => $asset['file_size'],
            ':converted_to_pdf' => $asset['converted_to_pdf'] ? 1 : 0,
        ]);
        $submissionId = (int)pdo()->lastInsertId();
        ActivityLogService::log($user, 'submit_book_for_review', 'success', 'book_submission', $submissionId, [
            'title' => trim((string)$_POST['title']),
            'source_name' => $asset['source_name'],
        ]);
        Response::ok([
            'id' => $submissionId,
            'status' => 'pending',
            'original_name' => $asset['original_name'],
            'source_name' => $asset['source_name'],
            'converted_to_pdf' => $asset['converted_to_pdf'],
        ], $asset['converted_to_pdf']
            ? 'Word document converted to PDF and sent to the librarian for verification'
            : 'Book sent to the librarian for verification');
    }

    if ($method === 'GET' && $path === '/book-submissions/my') {
        $user = current_user();
        require_role($user, ['STUDENT']);
        $stmt = pdo()->prepare(
            'SELECT bs.*, reviewer.full_name AS reviewer_name
             FROM book_submissions bs
             LEFT JOIN users reviewer ON reviewer.id=bs.reviewed_by
             WHERE bs.submitted_by=:user_id
             ORDER BY bs.created_at DESC'
        );
        $stmt->execute([':user_id' => $user['id']]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'GET' && $path === '/book-submissions') {
        $user = current_user();
        require_role($user, admin_roles());
        $status = trim((string)($_GET['status'] ?? ''));
        $params = [];
        $condition = '';
        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $condition = ' WHERE bs.status=:status';
            $params[':status'] = $status;
        }
        $stmt = pdo()->prepare(
            'SELECT bs.*, submitter.full_name AS submitted_by_name, submitter.email AS submitted_by_email,
                    reviewer.full_name AS reviewer_name
             FROM book_submissions bs
             JOIN users submitter ON submitter.id=bs.submitted_by
             LEFT JOIN users reviewer ON reviewer.id=bs.reviewed_by' .
             $condition . ' ORDER BY (bs.status="pending") DESC, bs.created_at DESC'
        );
        $stmt->execute($params);
        Response::ok($stmt->fetchAll());
    }

    if (preg_match('#^/book-submissions/(\d+)/download$#', $path, $m) && $method === 'GET') {
        $user = current_user();
        $submission = fetch_book_submission(Validator::int($m[1]));
        if ($user['role_code'] !== 'LIBRARIAN_ADMIN' && (int)$submission['submitted_by'] !== (int)$user['id']) {
            Response::error('You cannot access this submission', 403);
        }
        serve_stored_file(resolve_stored_upload($submission));
    }

    if (preg_match('#^/book-submissions/(\d+)/(approve|reject)$#', $path, $m) && $method === 'PATCH') {
        $user = current_user();
        require_role($user, admin_roles());
        $submissionId = Validator::int($m[1]);
        $action = $m[2];
        $data = body();
        $reviewNote = trim((string)($data['review_note'] ?? ''));

        if ($action === 'reject') {
            $stmt = pdo()->prepare(
                'UPDATE book_submissions
                 SET status="rejected", reviewed_by=:reviewed_by, reviewed_at=NOW(), review_note=:review_note
                 WHERE id=:id AND status="pending"'
            );
            $stmt->execute([
                ':reviewed_by' => $user['id'],
                ':review_note' => $reviewNote ?: null,
                ':id' => $submissionId,
            ]);
            if ($stmt->rowCount() !== 1) {
                Response::error('Only pending submissions can be rejected', 409);
            }
            $submission = fetch_book_submission($submissionId);
            pdo()->prepare(
                'INSERT INTO notifications (user_id, created_by, type, title, message)
                 VALUES (:user_id, :created_by, "system", :title, :message)'
            )->execute([
                ':user_id' => $submission['submitted_by'],
                ':created_by' => $user['id'],
                ':title' => 'Book submission needs attention',
                ':message' => $reviewNote !== ''
                    ? 'Your submission "' . $submission['title'] . '" was not approved: ' . $reviewNote
                    : 'Your submission "' . $submission['title'] . '" was not approved.',
            ]);
            ActivityLogService::log($user, 'reject_book_submission', 'success', 'book_submission', $submissionId);
            Response::ok(['id' => $submissionId, 'status' => 'rejected'], 'Book submission rejected');
        }

        $db = pdo();
        $db->beginTransaction();
        try {
            $submission = fetch_book_submission($submissionId, true);
            if ($submission['status'] !== 'pending') {
                $db->rollBack();
                Response::error('Only pending submissions can be approved', 409);
            }
            if ($submission['isbn']) {
                $duplicate = $db->prepare('SELECT id FROM books WHERE isbn=:isbn AND status <> "deleted" LIMIT 1');
                $duplicate->execute([':isbn' => $submission['isbn']]);
                if ($duplicate->fetch()) {
                    $db->rollBack();
                    Response::error('A catalog book already uses this ISBN', 409);
                }
            }

            $bookStmt = $db->prepare(
                'INSERT INTO books
                 (title, isbn, publisher, publication_year, description, keywords, total_copies, available_copies, created_by)
                 VALUES (:title, :isbn, :publisher, :publication_year, :description, :keywords,
                         :total_copies, :available_copies, :created_by)'
            );
            $bookStmt->execute([
                ':title' => $submission['title'],
                ':isbn' => $submission['isbn'],
                ':publisher' => $submission['publisher'],
                ':publication_year' => $submission['publication_year'],
                ':description' => $submission['description'],
                ':keywords' => $submission['keywords'],
                ':total_copies' => $submission['total_copies'],
                ':available_copies' => $submission['total_copies'],
                ':created_by' => $submission['submitted_by'],
            ]);
            $bookId = (int)$db->lastInsertId();

            $fileStmt = $db->prepare(
                'INSERT INTO book_files
                 (book_id, file_type, file_path, original_name, mime_type, file_size, uploaded_by)
                 VALUES (:book_id, :file_type, :file_path, :original_name, :mime_type, :file_size, :uploaded_by)'
            );
            $fileStmt->execute([
                ':book_id' => $bookId,
                ':file_type' => $submission['file_type'],
                ':file_path' => $submission['file_path'],
                ':original_name' => $submission['original_name'],
                ':mime_type' => $submission['mime_type'],
                ':file_size' => $submission['file_size'],
                ':uploaded_by' => $submission['submitted_by'],
            ]);

            $db->prepare(
                'UPDATE book_submissions
                 SET status="approved", reviewed_by=:reviewed_by, reviewed_at=NOW(),
                     review_note=:review_note, approved_book_id=:book_id
                 WHERE id=:id'
            )->execute([
                ':reviewed_by' => $user['id'],
                ':review_note' => $reviewNote ?: null,
                ':book_id' => $bookId,
                ':id' => $submissionId,
            ]);
            $db->prepare(
                'INSERT INTO notifications (user_id, created_by, type, title, message)
                 VALUES (:user_id, :created_by, "new_book", :title, :message)'
            )->execute([
                ':user_id' => $submission['submitted_by'],
                ':created_by' => $user['id'],
                ':title' => 'Book submission approved',
                ':message' => 'Your submission "' . $submission['title'] . '" is now available in the library.',
            ]);
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }

        ActivityLogService::log($user, 'approve_book_submission', 'success', 'book_submission', $submissionId, [
            'book_id' => $bookId,
        ]);
        Response::ok([
            'id' => $submissionId,
            'status' => 'approved',
            'book_id' => $bookId,
        ], 'Book submission approved and published');
    }

    if ($method === 'GET' && $path === '/personal-books') {
        $user = current_user();
        $stmt = pdo()->prepare(
            'SELECT id, title, author, description, language_code, file_type, original_name, source_name,
                    mime_type, file_size, converted_to_pdf, created_at, updated_at
             FROM personal_books
             WHERE user_id=:user_id AND status="active"
             ORDER BY created_at DESC'
        );
        $stmt->execute([':user_id' => $user['id']]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'POST' && $path === '/personal-books') {
        $user = current_user();
        if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
            Response::error('An English PDF, DOCX, or TXT book is required', 422);
        }
        $data = $_POST;
        $title = trim((string)($data['title'] ?? ''));
        if ($title === '') {
            Response::error('Book title is required', 422);
        }
        $extension = strtolower(pathinfo((string)($_FILES['file']['name'] ?? ''), PATHINFO_EXTENSION));
        if (!in_array($extension, ['pdf', 'docx', 'txt'], true)) {
            Response::error('Private books must be PDF, DOCX, or TXT files', 422);
        }

        $asset = process_uploaded_library_file($_FILES['file'], 'personal-books/' . (int)$user['id']);
        $content = extract_document_text($asset['absolute_path'], 20000);
        if (!$content || trim((string)($content['text'] ?? '')) === '') {
            delete_stored_upload($asset);
            Response::error('No readable English text could be extracted from this book', 422);
        }

        $stmt = pdo()->prepare(
            'INSERT INTO personal_books
             (user_id, title, author, description, language_code, file_type, file_path, original_name,
              source_name, mime_type, file_size, converted_to_pdf)
             VALUES (:user_id, :title, :author, :description, "en", :file_type, :file_path, :original_name,
                     :source_name, :mime_type, :file_size, :converted_to_pdf)'
        );
        $stmt->execute([
            ':user_id' => $user['id'],
            ':title' => $title,
            ':author' => trim((string)($data['author'] ?? '')) ?: null,
            ':description' => trim((string)($data['description'] ?? '')) ?: null,
            ':file_type' => $asset['file_type'],
            ':file_path' => $asset['file_path'],
            ':original_name' => $asset['original_name'],
            ':source_name' => $asset['source_name'],
            ':mime_type' => $asset['mime_type'],
            ':file_size' => $asset['file_size'],
            ':converted_to_pdf' => $asset['converted_to_pdf'] ? 1 : 0,
        ]);
        $personalBookId = (int)pdo()->lastInsertId();
        ActivityLogService::log($user, 'upload_private_book', 'success', 'personal_book', $personalBookId);
        Response::ok([
            'id' => $personalBookId,
            'converted_to_pdf' => $asset['converted_to_pdf'],
        ], $asset['converted_to_pdf']
            ? 'Word book converted to PDF and added to your private library'
            : 'Book added to your private library');
    }

    if (preg_match('#^/personal-books/(\d+)/content$#', $path, $m) && $method === 'GET') {
        $user = current_user();
        $book = fetch_personal_book(Validator::int($m[1]), (int)$user['id']);
        $file = resolve_stored_upload($book);
        $content = extract_document_text($file['absolute_path']);
        if (!$content || trim((string)($content['text'] ?? '')) === '') {
            Response::error('No readable text could be extracted from this private book', 422);
        }
        Response::ok([
            'id' => (int)$book['id'],
            'title' => $book['title'],
            'author' => $book['author'],
            'file_type' => $book['file_type'],
            ...$content,
        ]);
    }

    if (preg_match('#^/personal-books/(\d+)/download$#', $path, $m) && $method === 'GET') {
        $user = current_user();
        $book = fetch_personal_book(Validator::int($m[1]), (int)$user['id']);
        serve_stored_file(resolve_stored_upload($book));
    }

    if (preg_match('#^/personal-books/(\d+)$#', $path, $m)) {
        $user = current_user();
        $id = Validator::int($m[1]);
        $book = fetch_personal_book($id, (int)$user['id']);
        if ($method === 'GET') {
            Response::ok([
                'id' => (int)$book['id'],
                'title' => $book['title'],
                'author' => $book['author'],
                'description' => $book['description'],
                'language_code' => $book['language_code'],
                'file_type' => $book['file_type'],
                'original_name' => $book['original_name'],
                'file_size' => (int)$book['file_size'],
                'created_at' => $book['created_at'],
            ]);
        }
        if ($method === 'DELETE') {
            pdo()->prepare('DELETE FROM personal_books WHERE id=:id AND user_id=:user_id')
                ->execute([':id' => $id, ':user_id' => $user['id']]);
            delete_stored_upload($book);
            ActivityLogService::log($user, 'delete_private_book', 'success', 'personal_book', $id);
            Response::ok(['id' => $id], 'Private book permanently deleted');
        }
    }

    if ($method === 'GET' && $path === '/books') {
        $conditions = ["b.status <> 'deleted'"];
        $params = [];
        $q = trim((string)($_GET['q'] ?? ''));
        if ($q !== '') {
            $conditions[] = '(b.title LIKE :q_title OR b.subtitle LIKE :q_subtitle OR a.full_name LIKE :q_author OR b.isbn LIKE :q_isbn OR b.keywords LIKE :q_keywords)';
            $like = '%' . $q . '%';
            $params += [
                ':q_title' => $like,
                ':q_subtitle' => $like,
                ':q_author' => $like,
                ':q_isbn' => $like,
                ':q_keywords' => $like,
            ];
        }
        foreach (['faculty_id', 'department_id', 'course_id', 'category_id'] as $filter) {
            if (isset($_GET[$filter]) && $_GET[$filter] !== '') {
                $conditions[] = "b.{$filter} = :{$filter}";
                $params[":{$filter}"] = Validator::int($_GET[$filter], $filter);
            }
        }
        $availability = $_GET['availability'] ?? '';
        if ($availability === 'available') {
            $conditions[] = 'b.available_copies > 0';
        } elseif ($availability === 'unavailable') {
            $conditions[] = 'b.available_copies = 0';
        }
        $stmt = pdo()->prepare(
            book_select_sql() . ' WHERE ' . implode(' AND ', $conditions) .
            ' ORDER BY b.created_at DESC LIMIT :limit OFFSET :offset'
        );
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', bounded_int($_GET['limit'] ?? null, 50, 1, 100), PDO::PARAM_INT);
        $stmt->bindValue(':offset', bounded_int($_GET['offset'] ?? null, 0, 0, PHP_INT_MAX), PDO::PARAM_INT);
        $stmt->execute();
        $books = $stmt->fetchAll();
        foreach ($books as &$book) {
            $book['files'] = book_files_for((int)$book['id']);
        }
        Response::ok($books);
    }

    if ($method === 'POST' && $path === '/books') {
        $user = current_user();
        require_role($user, ['LECTURER', 'LIBRARIAN_ADMIN']);
        $data = body();
        Validator::require($data, ['title']);
        $total = bounded_int($data['total_copies'] ?? null, 1, 0, 1000000);
        $available = bounded_int($data['available_copies'] ?? null, $total, 0, $total);
        $stmt = pdo()->prepare('INSERT INTO books (author_id, category_id, faculty_id, department_id, course_id, title, subtitle, isbn, publisher, publication_year, description, keywords, shelf_location, total_copies, available_copies, created_by) VALUES (:author_id, :category_id, :faculty_id, :department_id, :course_id, :title, :subtitle, :isbn, :publisher, :publication_year, :description, :keywords, :shelf_location, :total_copies, :available_copies, :created_by)');
        $stmt->execute([
            ':author_id' => optional_int($data['author_id'] ?? null, 'author_id'),
            ':category_id' => optional_int($data['category_id'] ?? null, 'category_id'),
            ':faculty_id' => optional_int($data['faculty_id'] ?? null, 'faculty_id'),
            ':department_id' => optional_int($data['department_id'] ?? null, 'department_id'),
            ':course_id' => optional_int($data['course_id'] ?? null, 'course_id'),
            ':title' => trim((string)$data['title']),
            ':subtitle' => $data['subtitle'] ?? null,
            ':isbn' => ($data['isbn'] ?? '') !== '' ? trim((string)$data['isbn']) : null,
            ':publisher' => $data['publisher'] ?? null,
            ':publication_year' => optional_int($data['publication_year'] ?? null, 'publication_year'),
            ':description' => $data['description'] ?? null,
            ':keywords' => $data['keywords'] ?? null,
            ':shelf_location' => $data['shelf_location'] ?? null,
            ':total_copies' => $total,
            ':available_copies' => $available,
            ':created_by' => $user['id'],
        ]);
        Response::ok(['id' => (int)pdo()->lastInsertId()], 'Book created');
    }

    if (preg_match('#^/books/(\d+)$#', $path, $m)) {
        $id = Validator::int($m[1]);
        if ($method === 'GET') {
            $stmt = pdo()->prepare(book_select_sql() . ' WHERE b.id=:id AND b.status <> "deleted"');
            $stmt->execute([':id' => $id]);
            $book = $stmt->fetch();
            if ($book) {
                $book['files'] = book_files_for($id);
            }
            Response::ok($book);
        }
        $user = current_user();
        require_role($user, admin_roles());
        if ($method === 'PUT') {
            $data = body();
            $existing = fetch_book($id);
            $total = bounded_int($data['total_copies'] ?? null, (int)$existing['total_copies'], 0, 1000000);
            $available = bounded_int($data['available_copies'] ?? null, (int)$existing['available_copies'], 0, $total);
            $stmt = pdo()->prepare(
                'UPDATE books SET author_id=:author_id, category_id=:category_id, faculty_id=:faculty_id,
                 department_id=:department_id, course_id=:course_id, title=:title, subtitle=:subtitle, isbn=:isbn,
                 publisher=:publisher, publication_year=:publication_year, description=:description, keywords=:keywords,
                 shelf_location=:shelf_location, cover_image=:cover_image, total_copies=:total_copies,
                 available_copies=:available_copies WHERE id=:id'
            );
            $stmt->execute([
                ':author_id' => array_key_exists('author_id', $data) ? optional_int($data['author_id'], 'author_id') : $existing['author_id'],
                ':category_id' => array_key_exists('category_id', $data) ? optional_int($data['category_id'], 'category_id') : $existing['category_id'],
                ':faculty_id' => array_key_exists('faculty_id', $data) ? optional_int($data['faculty_id'], 'faculty_id') : $existing['faculty_id'],
                ':department_id' => array_key_exists('department_id', $data) ? optional_int($data['department_id'], 'department_id') : $existing['department_id'],
                ':course_id' => array_key_exists('course_id', $data) ? optional_int($data['course_id'], 'course_id') : $existing['course_id'],
                ':title' => trim((string)($data['title'] ?? $existing['title'])),
                ':subtitle' => $data['subtitle'] ?? $existing['subtitle'],
                ':isbn' => array_key_exists('isbn', $data) && $data['isbn'] === '' ? null : ($data['isbn'] ?? $existing['isbn']),
                ':publisher' => $data['publisher'] ?? $existing['publisher'],
                ':publication_year' => array_key_exists('publication_year', $data) ? optional_int($data['publication_year'], 'publication_year') : $existing['publication_year'],
                ':description' => $data['description'] ?? $existing['description'],
                ':keywords' => $data['keywords'] ?? $existing['keywords'],
                ':shelf_location' => $data['shelf_location'] ?? $existing['shelf_location'],
                ':cover_image' => $data['cover_image'] ?? $existing['cover_image'],
                ':total_copies' => $total,
                ':available_copies' => $available,
                ':id' => $id,
            ]);
            Response::ok(['id' => $id], 'Book updated');
        }
        if ($method === 'DELETE') {
            pdo()->prepare('UPDATE books SET status="deleted" WHERE id=:id')->execute([':id' => $id]);
            Response::ok(['id' => $id], 'Book deleted safely');
        }
    }

    if (preg_match('#^/books/(\d+)/archive$#', $path, $m) && $method === 'PATCH') {
        $user = current_user();
        require_role($user, admin_roles());
        pdo()->prepare('UPDATE books SET status="archived" WHERE id=:id')->execute([':id' => Validator::int($m[1])]);
        Response::ok(null, 'Book archived');
    }

    if (preg_match('#^/books/(\d+)/availability$#', $path, $m) && $method === 'PATCH') {
        $user = current_user();
        require_role($user, admin_roles());
        $id = Validator::int($m[1]);
        $book = fetch_book($id);
        $available = bounded_int(body()['available_copies'] ?? null, (int)$book['available_copies'], 0, (int)$book['total_copies']);
        pdo()->prepare('UPDATE books SET available_copies=:available WHERE id=:id')
            ->execute([':available' => $available, ':id' => $id]);
        Response::ok(['id' => $id, 'available_copies' => $available], 'Book availability updated');
    }

    if (preg_match('#^/books/(\d+)/files$#', $path, $m)) {
        $bookId = Validator::int($m[1]);
        if ($method === 'GET') {
            current_user();
            Response::ok(book_files_for($bookId));
        }
        if ($method === 'POST') {
            $user = current_user();
            require_role($user, ['LECTURER', 'LIBRARIAN_ADMIN']);
            if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
                Response::error('Upload file is required', 422);
            }
            fetch_book($bookId);
            $asset = process_uploaded_library_file($_FILES['file'], 'books/' . $bookId);
            $stmt = pdo()->prepare('INSERT INTO book_files (book_id, file_type, file_path, original_name, mime_type, file_size, uploaded_by) VALUES (:book_id, :file_type, :file_path, :original_name, :mime_type, :file_size, :uploaded_by)');
            $stmt->execute([
                ':book_id' => $bookId,
                ':file_type' => $asset['file_type'],
                ':file_path' => $asset['file_path'],
                ':original_name' => $asset['original_name'],
                ':mime_type' => $asset['mime_type'],
                ':file_size' => $asset['file_size'],
                ':uploaded_by' => $user['id'],
            ]);
            $fileId = (int)pdo()->lastInsertId();
            ActivityLogService::log($user, $asset['converted_to_pdf'] ? 'convert_word_book_to_pdf' : 'upload_book_file', 'success', 'book_file', $fileId, [
                'book_id' => $bookId,
                'source_name' => $asset['source_name'],
                'stored_name' => $asset['original_name'],
            ]);
            Response::ok([
                'id' => $fileId,
                'book_id' => $bookId,
                'file_type' => $asset['file_type'],
                'original_name' => $asset['original_name'],
                'source_name' => $asset['source_name'],
                'converted_to_pdf' => $asset['converted_to_pdf'],
                'file_size' => $asset['file_size'],
            ], $asset['converted_to_pdf'] ? 'Word document converted to PDF and uploaded' : 'Book file uploaded');
        }
    }

    if (preg_match('#^/book-files/(\d+)/download$#', $path, $m) && $method === 'GET') {
        current_user();
        serve_stored_file(stored_book_file(Validator::int($m[1])));
    }

    if (preg_match('#^/book-files/(\d+)/stream$#', $path, $m) && $method === 'GET') {
        current_user();
        serve_stored_file(stored_book_file(Validator::int($m[1])), true);
    }

    if (preg_match('#^/book-files/(\d+)/content$#', $path, $m) && $method === 'GET') {
        current_user();
        $file = stored_book_file(Validator::int($m[1]));
        $content = extract_document_text($file['absolute_path']);
        if (!$content || trim($content['text'] ?? '') === '') {
            Response::error('No readable text could be extracted from this file', 422);
        }
        Response::ok([
            'file_id' => (int)$file['id'],
            'book_id' => (int)$file['book_id'],
            'file_type' => $file['file_type'],
            'original_name' => $file['original_name'],
            ...$content,
        ]);
    }

    if (preg_match('#^/books/(\d+)/content$#', $path, $m) && $method === 'GET') {
        current_user();
        $bookId = Validator::int($m[1]);
        $stmt = pdo()->prepare(
            'SELECT id FROM book_files
             WHERE book_id=:book_id AND status="active" AND file_type IN ("pdf","docx","txt")
             ORDER BY FIELD(file_type, "pdf", "txt", "docx"), created_at DESC LIMIT 1'
        );
        $stmt->execute([':book_id' => $bookId]);
        $fileId = (int)($stmt->fetchColumn() ?: 0);
        if (!$fileId) {
            Response::error('This book has no readable document file', 404);
        }
        $file = stored_book_file($fileId);
        $content = extract_document_text($file['absolute_path']);
        if (!$content || trim($content['text'] ?? '') === '') {
            Response::error('No readable text could be extracted from this book', 422);
        }
        Response::ok([
            'file_id' => $fileId,
            'book_id' => $bookId,
            'file_type' => $file['file_type'],
            'original_name' => $file['original_name'],
            ...$content,
        ]);
    }

    if ($method === 'GET' && $path === '/search/books') {
        $user = current_user(false);
        $q = trim((string)($_GET['q'] ?? ''));
        $parsedQuery = parse_catalog_query($q);
        $searchTerms = $parsedQuery['keywords'] !== '' ? $parsedQuery['keywords'] : $q;
        $like = "%{$searchTerms}%";
        $authorLike = '%' . ($parsedQuery['author'] !== '' ? $parsedQuery['author'] : $searchTerms) . '%';
        $availability = (string)($_GET['availability'] ?? $parsedQuery['availability']);
        $availabilitySql = match ($availability) {
            'available' => ' AND b.available_copies > 0',
            'unavailable' => ' AND b.available_copies = 0',
            default => '',
        };
        $filterSql = '';
        $filterParams = [];
        foreach (['faculty_id', 'department_id', 'category_id'] as $filter) {
            if (isset($_GET[$filter]) && $_GET[$filter] !== '') {
                $filterSql .= " AND b.{$filter}=:{$filter}";
                $filterParams[":{$filter}"] = Validator::int($_GET[$filter], $filter);
            }
        }
        $orderBy = match ((string)($_GET['sort'] ?? '')) {
            'title' => 'b.title ASC',
            'year' => 'b.publication_year DESC, b.title ASC',
            default => 'relevance_score DESC, b.created_at DESC',
        };
        $sql = str_replace(
            'FROM books b',
            ', (CASE
                WHEN b.title = :title_exact THEN 100
                WHEN b.title LIKE :rank_title THEN 70
                WHEN a.full_name LIKE :rank_author THEN 60
                WHEN cat.name LIKE :rank_category THEN 50
                WHEN c.name LIKE :rank_course THEN 45
                WHEN d.name LIKE :rank_department THEN 40
                WHEN f.name LIKE :rank_faculty THEN 35
                WHEN b.keywords LIKE :rank_keywords THEN 30
                WHEN b.description LIKE :rank_description THEN 20
                ELSE 0 END) AS relevance_score
             FROM books b',
            book_select_sql()
        ) . " WHERE b.status='active'
            AND (:q = '' OR b.title LIKE :like_title OR a.full_name LIKE :like_author OR b.isbn LIKE :like_isbn
                 OR b.keywords LIKE :like_keywords OR b.description LIKE :like_description
                 OR cat.name LIKE :like_category OR c.name LIKE :like_course
                 OR d.name LIKE :like_department OR f.name LIKE :like_faculty)
            {$availabilitySql}{$filterSql} ORDER BY {$orderBy} LIMIT 50";
        $stmt = pdo()->prepare($sql);
        $stmt->execute([
            ':q' => $searchTerms,
            ':title_exact' => $searchTerms,
            ':rank_title' => $like,
            ':rank_author' => $authorLike,
            ':rank_category' => $like,
            ':rank_course' => $like,
            ':rank_department' => $like,
            ':rank_faculty' => $like,
            ':rank_keywords' => $like,
            ':rank_description' => $like,
            ':like_title' => $like,
            ':like_author' => $authorLike,
            ':like_isbn' => $like,
            ':like_keywords' => $like,
            ':like_description' => $like,
            ':like_category' => $like,
            ':like_course' => $like,
            ':like_department' => $like,
            ':like_faculty' => $like,
        ] + $filterParams);
        $rows = $stmt->fetchAll();
        pdo()->prepare('INSERT INTO search_logs (user_id, query_text, filters, results_count, status) VALUES (:user_id, :query_text, :filters, :results_count, :status)')
            ->execute([
                ':user_id' => $user['id'] ?? null,
                ':query_text' => $q,
                ':filters' => json_encode(['request' => $_GET, 'parsed' => $parsedQuery]),
                ':results_count' => count($rows),
                ':status' => count($rows) ? 'success' : 'no_results',
            ]);
        Response::ok(['results' => $rows, 'parsed_query' => $parsedQuery]);
    }

    if ($method === 'GET' && in_array($path, ['/faculties', '/departments', '/courses', '/categories', '/authors'], true)) {
        $includeArchived = !empty($_GET['include_archived']);
        if ($path === '/departments') {
            $conditions = $includeArchived ? [] : ['d.status="active"'];
            $params = [];
            if (!empty($_GET['faculty_id'])) {
                $conditions[] = 'd.faculty_id=:faculty_id';
                $params[':faculty_id'] = Validator::int($_GET['faculty_id'], 'faculty_id');
            }
            $stmt = pdo()->prepare(
                'SELECT d.*, f.name AS faculty_name, f.code AS faculty_code
                 FROM departments d JOIN faculties f ON f.id=d.faculty_id' .
                ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '') .
                ' ORDER BY f.name, d.name'
            );
            $stmt->execute($params);
            Response::ok($stmt->fetchAll());
        }
        if ($path === '/courses') {
            $condition = $includeArchived ? '' : ' WHERE c.status="active"';
            $stmt = pdo()->query(
                'SELECT c.*, d.name AS department_name, f.name AS faculty_name
                 FROM courses c
                 JOIN departments d ON d.id=c.department_id
                 JOIN faculties f ON f.id=d.faculty_id' .
                $condition . ' ORDER BY f.name, d.name, c.name'
            );
            Response::ok($stmt->fetchAll());
        }
        $table = trim($path, '/');
        $orderColumn = $table === 'authors' ? 'full_name' : 'name';
        $condition = $includeArchived ? '' : " WHERE status='active'";
        $stmt = pdo()->query("SELECT * FROM {$table}{$condition} ORDER BY {$orderColumn}");
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'POST' && in_array($path, ['/faculties', '/departments', '/courses', '/categories', '/authors'], true)) {
        $user = current_user();
        require_role($user, admin_roles());
        $data = body();
        Validator::require($data, [$path === '/authors' ? 'full_name' : 'name']);
        if ($path === '/faculties') {
            pdo()->prepare('INSERT INTO faculties (name, code, description) VALUES (:name, :code, :description)')->execute([':name' => $data['name'], ':code' => $data['code'] ?? null, ':description' => $data['description'] ?? null]);
        } elseif ($path === '/departments') {
            pdo()->prepare('INSERT INTO departments (faculty_id, name, code, description) VALUES (:faculty_id, :name, :code, :description)')->execute([':faculty_id' => Validator::int($data['faculty_id'], 'faculty_id'), ':name' => $data['name'], ':code' => $data['code'] ?? null, ':description' => $data['description'] ?? null]);
        } elseif ($path === '/courses') {
            pdo()->prepare('INSERT INTO courses (department_id, name, code, description) VALUES (:department_id, :name, :code, :description)')->execute([':department_id' => Validator::int($data['department_id'], 'department_id'), ':name' => $data['name'], ':code' => $data['code'] ?? null, ':description' => $data['description'] ?? null]);
        } elseif ($path === '/categories') {
            pdo()->prepare('INSERT INTO categories (name, description) VALUES (:name, :description)')
                ->execute([':name' => $data['name'], ':description' => $data['description'] ?? null]);
        } else {
            pdo()->prepare('INSERT INTO authors (full_name, biography) VALUES (:full_name, :biography)')
                ->execute([':full_name' => $data['full_name'], ':biography' => $data['biography'] ?? null]);
        }
        Response::ok(['id' => (int)pdo()->lastInsertId()], 'Academic record created');
    }

    if (preg_match('#^/(faculties|departments|courses)/(\d+)$#', $path, $m) && in_array($method, ['PUT', 'DELETE'], true)) {
        $user = current_user();
        require_role($user, admin_roles());
        $table = $m[1];
        $entityName = match ($table) {
            'faculties' => 'faculty',
            'departments' => 'department',
            default => 'course',
        };
        $id = Validator::int($m[2]);
        if ($method === 'DELETE') {
            pdo()->prepare("UPDATE {$table} SET status='archived' WHERE id=:id")->execute([':id' => $id]);
            ActivityLogService::log($user, 'archive_' . $entityName, 'success', $table, $id);
            Response::ok(['id' => $id], 'Academic record archived');
        }
        $data = body();
        Validator::require($data, ['name']);
        if ($table === 'faculties') {
            pdo()->prepare('UPDATE faculties SET name=:name, code=:code, description=:description, status=:status WHERE id=:id')
                ->execute([
                    ':name' => trim((string)$data['name']),
                    ':code' => trim((string)($data['code'] ?? '')) ?: null,
                    ':description' => $data['description'] ?? null,
                    ':status' => $data['status'] ?? 'active',
                    ':id' => $id,
                ]);
        } elseif ($table === 'departments') {
            pdo()->prepare('UPDATE departments SET faculty_id=:parent_id, name=:name, code=:code, description=:description, status=:status WHERE id=:id')
                ->execute([
                    ':parent_id' => Validator::int($data['faculty_id'] ?? null, 'faculty_id'),
                    ':name' => trim((string)$data['name']),
                    ':code' => trim((string)($data['code'] ?? '')) ?: null,
                    ':description' => $data['description'] ?? null,
                    ':status' => $data['status'] ?? 'active',
                    ':id' => $id,
                ]);
        } else {
            pdo()->prepare('UPDATE courses SET department_id=:parent_id, name=:name, code=:code, description=:description, status=:status WHERE id=:id')
                ->execute([
                    ':parent_id' => Validator::int($data['department_id'] ?? null, 'department_id'),
                    ':name' => trim((string)$data['name']),
                    ':code' => trim((string)($data['code'] ?? '')) ?: null,
                    ':description' => $data['description'] ?? null,
                    ':status' => $data['status'] ?? 'active',
                    ':id' => $id,
                ]);
        }
        ActivityLogService::log($user, 'update_' . $entityName, 'success', $table, $id);
        Response::ok(['id' => $id], 'Academic record updated');
    }

    if ($method === 'POST' && $path === '/academic/book-courses') {
        $user = current_user();
        require_role($user, ['LECTURER', 'LIBRARIAN_ADMIN']);
        $data = body();
        $bookId = Validator::int($data['book_id'] ?? null, 'book_id');
        $courseId = Validator::int($data['course_id'] ?? null, 'course_id');
        pdo()->prepare(
            'INSERT INTO book_courses (book_id, course_id, status) VALUES (:book_id, :course_id, "active")
             ON DUPLICATE KEY UPDATE status="active"'
        )->execute([':book_id' => $bookId, ':course_id' => $courseId]);
        Response::ok(['book_id' => $bookId, 'course_id' => $courseId], 'Book assigned to course');
    }

    if ($method === 'POST' && $path === '/academic/lecturer-courses') {
        $user = current_user();
        require_role($user, admin_roles());
        $data = body();
        $lecturerId = Validator::int($data['lecturer_id'] ?? null, 'lecturer_id');
        $courseId = Validator::int($data['course_id'] ?? null, 'course_id');
        $role = pdo()->prepare('SELECT r.code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=:id AND u.status="active"');
        $role->execute([':id' => $lecturerId]);
        if ($role->fetchColumn() !== 'LECTURER') {
            Response::error('Selected user is not an active lecturer', 422);
        }
        pdo()->prepare(
            'INSERT INTO lecturer_courses (lecturer_id, course_id, status) VALUES (:lecturer_id, :course_id, "active")
             ON DUPLICATE KEY UPDATE status="active"'
        )->execute([':lecturer_id' => $lecturerId, ':course_id' => $courseId]);
        Response::ok(['lecturer_id' => $lecturerId, 'course_id' => $courseId], 'Lecturer assigned to course');
    }

    if (preg_match('#^/academic/(faculties|departments|courses)/(\d+)/books$#', $path, $m) && $method === 'GET') {
        $column = match ($m[1]) {
            'faculties' => 'faculty_id',
            'departments' => 'department_id',
            default => 'course_id',
        };
        $stmt = pdo()->prepare(book_select_sql() . " WHERE b.status='active' AND b.{$column}=:id ORDER BY b.title");
        $stmt->execute([':id' => Validator::int($m[2])]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'POST' && $path === '/borrow/request') {
        $user = current_user();
        require_role($user, ['STUDENT']);
        $data = body();
        $bookId = Validator::int($data['book_id'] ?? null, 'book_id');
        $book = fetch_book($bookId);
        if ($book['status'] !== 'active') {
            Response::error('This book is not available for borrowing', 409);
        }
        $existing = pdo()->prepare(
            'SELECT id FROM borrow_requests
             WHERE user_id=:user_id AND book_id=:book_id AND status IN ("pending","approved","overdue") LIMIT 1'
        );
        $existing->execute([':user_id' => $user['id'], ':book_id' => $bookId]);
        if ($existing->fetch()) {
            Response::error('An active borrow request already exists for this book', 409);
        }
        $stmt = pdo()->prepare('INSERT INTO borrow_requests (user_id, book_id) VALUES (:user_id, :book_id)');
        $stmt->execute([':user_id' => $user['id'], ':book_id' => $bookId]);
        $requestId = (int)pdo()->lastInsertId();
        ActivityLogService::log($user, 'borrow_request', 'success', 'book', $bookId);
        Response::ok(['id' => $requestId], 'Borrow request created');
    }

    if ($method === 'GET' && $path === '/borrow/my-books') {
        $user = current_user();
        $stmt = pdo()->prepare('SELECT br.*, b.title AS book_title FROM borrow_requests br JOIN books b ON b.id=br.book_id WHERE br.user_id=:user_id ORDER BY br.created_at DESC');
        $stmt->execute([':user_id' => $user['id']]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'GET' && $path === '/borrow') {
        $user = current_user();
        require_role($user, admin_roles());
        $stmt = pdo()->query('SELECT br.*, b.title AS book_title, u.full_name AS user_name FROM borrow_requests br JOIN books b ON b.id=br.book_id JOIN users u ON u.id=br.user_id ORDER BY br.created_at DESC');
        Response::ok($stmt->fetchAll());
    }

    if (preg_match('#^/borrow/(\d+)/(approve|reject|return|renew)$#', $path, $m) && $method === 'PATCH') {
        $user = current_user();
        require_role($user, admin_roles());
        $id = Validator::int($m[1]);
        $action = $m[2];
        $data = body();
        try {
            pdo()->beginTransaction();
            $requestStmt = pdo()->prepare('SELECT * FROM borrow_requests WHERE id=:id FOR UPDATE');
            $requestStmt->execute([':id' => $id]);
            $request = $requestStmt->fetch();
            if (!$request) {
                throw new RuntimeException('Borrow request not found', 404);
            }
            fetch_book((int)$request['book_id'], true);
            if ($action === 'approve') {
                if ($request['status'] !== 'pending') {
                    throw new RuntimeException('Only pending requests can be approved', 409);
                }
                $inventory = pdo()->prepare(
                    'UPDATE books SET available_copies=available_copies-1
                     WHERE id=:book_id AND status="active" AND available_copies > 0'
                );
                $inventory->execute([':book_id' => $request['book_id']]);
                if ($inventory->rowCount() !== 1) {
                    throw new RuntimeException('No available copy remains for this book', 409);
                }
                pdo()->prepare(
                    'UPDATE borrow_requests SET status="approved", approved_by=:user_id, approved_at=NOW(),
                     due_date=DATE_ADD(CURDATE(), INTERVAL 14 DAY) WHERE id=:id'
                )->execute([':user_id' => $user['id'], ':id' => $id]);
            } elseif ($action === 'reject') {
                if ($request['status'] !== 'pending') {
                    throw new RuntimeException('Only pending requests can be rejected', 409);
                }
                pdo()->prepare(
                    'UPDATE borrow_requests SET status="rejected", rejected_by=:user_id, rejected_at=NOW(),
                     rejection_reason=:reason WHERE id=:id'
                )->execute([':user_id' => $user['id'], ':reason' => $data['reason'] ?? null, ':id' => $id]);
            } elseif ($action === 'return') {
                if (!in_array($request['status'], ['approved', 'overdue'], true)) {
                    throw new RuntimeException('Only active loans can be returned', 409);
                }
                pdo()->prepare('UPDATE borrow_requests SET status="returned", returned_at=NOW() WHERE id=:id')
                    ->execute([':id' => $id]);
                pdo()->prepare(
                    'UPDATE books SET available_copies=LEAST(total_copies, available_copies+1) WHERE id=:book_id'
                )->execute([':book_id' => $request['book_id']]);
            } else {
                if (!in_array($request['status'], ['approved', 'overdue'], true) || !$request['due_date']) {
                    throw new RuntimeException('Only active loans with a due date can be renewed', 409);
                }
                pdo()->prepare(
                    'UPDATE borrow_requests SET status="approved", renewed_until=DATE_ADD(due_date, INTERVAL 7 DAY),
                     due_date=DATE_ADD(due_date, INTERVAL 7 DAY) WHERE id=:id'
                )->execute([':id' => $id]);
            }
            pdo()->prepare(
                'INSERT INTO borrowing_history (borrow_request_id, user_id, book_id, action, action_by, notes)
                 VALUES (:request_id, :user_id, :book_id, :action, :action_by, :notes)'
            )->execute([
                ':request_id' => $id,
                ':user_id' => $request['user_id'],
                ':book_id' => $request['book_id'],
                ':action' => $action,
                ':action_by' => $user['id'],
                ':notes' => $data['reason'] ?? null,
            ]);
            if (in_array($action, ['approve', 'reject'], true)) {
                pdo()->prepare(
                    'INSERT INTO notifications (user_id, created_by, type, title, message)
                     VALUES (:user_id, :created_by, :type, :title, :message)'
                )->execute([
                    ':user_id' => $request['user_id'],
                    ':created_by' => $user['id'],
                    ':type' => $action === 'approve' ? 'borrow_approved' : 'borrow_rejected',
                    ':title' => $action === 'approve' ? 'Borrow request approved' : 'Borrow request rejected',
                    ':message' => $action === 'approve'
                        ? 'Your requested book is ready. Check your borrowed books for the due date.'
                        : (string)($data['reason'] ?? 'Your borrow request was rejected.'),
                ]);
            }
            pdo()->commit();
        } catch (RuntimeException $e) {
            if (pdo()->inTransaction()) {
                pdo()->rollBack();
            }
            Response::error($e->getMessage(), $e->getCode() >= 400 ? $e->getCode() : 409);
        } catch (Throwable $e) {
            if (pdo()->inTransaction()) {
                pdo()->rollBack();
            }
            throw $e;
        }
        Response::ok(['id' => $id], 'Borrowing updated');
    }

    if ($method === 'GET' && $path === '/borrow/overdue') {
        $user = current_user();
        require_role($user, admin_roles());
        $stmt = pdo()->query('SELECT br.*, b.title AS book_title, u.full_name AS user_name FROM borrow_requests br JOIN books b ON b.id=br.book_id JOIN users u ON u.id=br.user_id WHERE br.status="approved" AND br.due_date < CURDATE()');
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'GET' && $path === '/progress') {
        $user = current_user();
        $stmt = pdo()->prepare('SELECT rp.*, b.title AS book_title FROM reading_progress rp JOIN books b ON b.id=rp.book_id WHERE rp.user_id=:user_id');
        $stmt->execute([':user_id' => $user['id']]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'POST' && $path === '/progress') {
        $user = current_user();
        $data = body();
        $stmt = pdo()->prepare('INSERT INTO reading_progress (user_id, book_id, last_page, last_section, progress_percentage, total_reading_time_seconds, completed_status) VALUES (:user_id, :book_id, :last_page, :last_section, :progress_percentage, :time, :completed_status) ON DUPLICATE KEY UPDATE last_page=VALUES(last_page), last_section=VALUES(last_section), progress_percentage=VALUES(progress_percentage), total_reading_time_seconds=VALUES(total_reading_time_seconds), completed_status=VALUES(completed_status)');
        $stmt->execute([':user_id' => $user['id'], ':book_id' => Validator::int($data['book_id'] ?? null, 'book_id'), ':last_page' => (int)($data['last_page'] ?? 0), ':last_section' => $data['last_section'] ?? null, ':progress_percentage' => (float)($data['progress_percentage'] ?? 0), ':time' => (int)($data['total_reading_time_seconds'] ?? 0), ':completed_status' => $data['completed_status'] ?? 'in_progress']);
        Response::ok(null, 'Progress saved');
    }

    if (preg_match('#^/progress/(\d+)$#', $path, $m)) {
        $user = current_user();
        $bookId = Validator::int($m[1], 'book_id');
        if ($method === 'GET') {
            $stmt = pdo()->prepare(
                'SELECT rp.*, b.title AS book_title FROM reading_progress rp
                 JOIN books b ON b.id=rp.book_id WHERE rp.user_id=:user_id AND rp.book_id=:book_id'
            );
            $stmt->execute([':user_id' => $user['id'], ':book_id' => $bookId]);
            Response::ok($stmt->fetch());
        }
        if (in_array($method, ['PATCH', 'PUT'], true)) {
            $data = body();
            $progress = max(0, min(100, (float)($data['progress_percentage'] ?? $data['progress'] ?? 0)));
            $completed = $data['completed_status'] ?? ($progress >= 100 ? 'completed' : ($progress > 0 ? 'in_progress' : 'not_started'));
            pdo()->prepare(
                'INSERT INTO reading_progress
                 (user_id, book_id, last_page, last_section, progress_percentage, total_reading_time_seconds, completed_status, status)
                 VALUES (:user_id, :book_id, :last_page, :last_section, :progress, :time, :completed, "active")
                 ON DUPLICATE KEY UPDATE last_page=VALUES(last_page), last_section=VALUES(last_section),
                 progress_percentage=VALUES(progress_percentage),
                 total_reading_time_seconds=total_reading_time_seconds + VALUES(total_reading_time_seconds),
                 completed_status=VALUES(completed_status), status="active"'
            )->execute([
                ':user_id' => $user['id'],
                ':book_id' => $bookId,
                ':last_page' => max(0, (int)($data['last_page'] ?? $data['page'] ?? 0)),
                ':last_section' => $data['last_section'] ?? $data['section'] ?? null,
                ':progress' => $progress,
                ':time' => max(0, (int)($data['total_reading_time_seconds'] ?? $data['reading_time_seconds'] ?? 0)),
                ':completed' => $completed,
            ]);
            Response::ok(['book_id' => $bookId, 'progress_percentage' => $progress], 'Progress updated');
        }
        if ($method === 'DELETE') {
            pdo()->prepare(
                'UPDATE reading_progress SET last_page=0, last_section=NULL, progress_percentage=0,
                 total_reading_time_seconds=0, completed_status="not_started", status="reset"
                 WHERE user_id=:user_id AND book_id=:book_id'
            )->execute([':user_id' => $user['id'], ':book_id' => $bookId]);
            Response::ok(['book_id' => $bookId], 'Progress reset');
        }
    }

    if ($method === 'GET' && $path === '/favorites') {
        $user = current_user();
        $stmt = pdo()->prepare('SELECT f.*, b.title, b.cover_image FROM favorites f JOIN books b ON b.id=f.book_id WHERE f.user_id=:user_id AND f.status="active"');
        $stmt->execute([':user_id' => $user['id']]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'POST' && $path === '/favorites') {
        $user = current_user();
        $bookId = Validator::int(body()['book_id'] ?? null, 'book_id');
        pdo()->prepare('INSERT INTO favorites (user_id, book_id) VALUES (:user_id, :book_id) ON DUPLICATE KEY UPDATE status="active"')->execute([':user_id' => $user['id'], ':book_id' => $bookId]);
        Response::ok(null, 'Favorite added');
    }

    if ($method === 'POST' && $path === '/favorites/toggle') {
        $user = current_user();
        $data = body();
        $bookId = Validator::int($data['book_id'] ?? $data['bookId'] ?? null, 'book_id');
        $stmt = pdo()->prepare('SELECT status FROM favorites WHERE user_id=:user_id AND book_id=:book_id');
        $stmt->execute([':user_id' => $user['id'], ':book_id' => $bookId]);
        $current = $stmt->fetchColumn();
        $next = $current === 'active' ? 'removed' : 'active';
        pdo()->prepare(
            'INSERT INTO favorites (user_id, book_id, status) VALUES (:user_id, :book_id, :status)
             ON DUPLICATE KEY UPDATE status=VALUES(status)'
        )->execute([':user_id' => $user['id'], ':book_id' => $bookId, ':status' => $next]);
        Response::ok(['book_id' => $bookId, 'favorite' => $next === 'active'], 'Favorite updated');
    }

    if (preg_match('#^/favorites/(\d+)$#', $path, $m) && $method === 'DELETE') {
        $user = current_user();
        pdo()->prepare('UPDATE favorites SET status="removed" WHERE user_id=:user_id AND book_id=:book_id')->execute([':user_id' => $user['id'], ':book_id' => Validator::int($m[1], 'book_id')]);
        Response::ok(null, 'Favorite removed');
    }

    if ($method === 'GET' && $path === '/bookmarks') {
        $user = current_user();
        $stmt = pdo()->prepare('SELECT bm.*, b.title FROM bookmarks bm JOIN books b ON b.id=bm.book_id WHERE bm.user_id=:user_id AND bm.status="active"');
        $stmt->execute([':user_id' => $user['id']]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'POST' && $path === '/bookmarks') {
        $user = current_user();
        $data = body();
        $bookId = Validator::int($data['book_id'] ?? null, 'book_id');
        $database = pdo();
        $database->prepare('INSERT INTO bookmarks (user_id, book_id, page_number, section, note) VALUES (:user_id, :book_id, :page_number, :section, :note)')
            ->execute([':user_id' => $user['id'], ':book_id' => $bookId, ':page_number' => $data['page_number'] ?? null, ':section' => $data['section'] ?? null, ':note' => $data['note'] ?? null]);
        Response::ok(['id' => (int) $database->lastInsertId(), 'book_id' => $bookId], 'Bookmark added');
    }

    if (preg_match('#^/bookmarks/(\d+)$#', $path, $m) && $method === 'DELETE') {
        $user = current_user();
        pdo()->prepare('UPDATE bookmarks SET status="removed" WHERE id=:id AND user_id=:user_id')
            ->execute([':id' => Validator::int($m[1]), ':user_id' => $user['id']]);
        Response::ok(null, 'Bookmark removed');
    }

    if (preg_match('#^/ratings/(\d+)$#', $path, $m) && $method === 'GET') {
        $stmt = pdo()->prepare(
            'SELECT ROUND(AVG(rating),2) AS average_rating, COUNT(*) AS total_ratings
             FROM ratings WHERE book_id=:book_id AND status="active"'
        );
        $stmt->execute([':book_id' => Validator::int($m[1], 'book_id')]);
        Response::ok($stmt->fetch());
    }

    if ($method === 'POST' && $path === '/ratings') {
        $user = current_user();
        $data = body();
        Validator::require($data, ['rating']);
        $bookId = Validator::int($data['book_id'] ?? $data['bookId'] ?? null, 'book_id');
        $rating = bounded_int($data['rating'] ?? null, 0, 1, 5);
        pdo()->prepare(
            'INSERT INTO ratings (user_id, book_id, rating, status) VALUES (:user_id, :book_id, :rating, "active")
             ON DUPLICATE KEY UPDATE rating=VALUES(rating), status="active"'
        )->execute([':user_id' => $user['id'], ':book_id' => $bookId, ':rating' => $rating]);
        Response::ok(['book_id' => $bookId, 'rating' => $rating], 'Rating saved');
    }

    if ($method === 'GET' && $path === '/reviews') {
        $user = current_user();
        require_role($user, admin_roles());
        $status = trim((string)($_GET['status'] ?? ''));
        $condition = in_array($status, ['pending', 'approved', 'hidden', 'deleted'], true)
            ? ' WHERE rv.status=:status'
            : '';
        $stmt = pdo()->prepare(
            'SELECT rv.id, rv.book_id, rv.user_id, rv.review_text AS text, rv.status, rv.moderation_note,
                    rv.created_at, rv.moderated_at, u.full_name AS author, u.email, b.title AS book_title,
                    moderator.full_name AS moderator_name
             FROM reviews rv
             JOIN users u ON u.id=rv.user_id
             JOIN books b ON b.id=rv.book_id
             LEFT JOIN users moderator ON moderator.id=rv.moderated_by' .
             $condition . ' ORDER BY (rv.status="pending") DESC, rv.created_at DESC LIMIT 200'
        );
        $stmt->execute($condition ? [':status' => $status] : []);
        Response::ok($stmt->fetchAll());
    }

    if (preg_match('#^/reviews/(\d+)$#', $path, $m)) {
        $id = Validator::int($m[1]);
        if ($method === 'GET') {
            $stmt = pdo()->prepare(
                'SELECT rv.id, rv.user_id, rv.book_id, rv.review_text AS text, rv.status, rv.created_at,
                 u.full_name AS author, rt.rating
                 FROM reviews rv JOIN users u ON u.id=rv.user_id
                 LEFT JOIN ratings rt ON rt.user_id=rv.user_id AND rt.book_id=rv.book_id AND rt.status="active"
                 WHERE rv.book_id=:book_id AND rv.status="approved" ORDER BY rv.created_at DESC'
            );
            $stmt->execute([':book_id' => $id]);
            Response::ok($stmt->fetchAll());
        }
        $user = current_user();
        if ($method === 'PUT') {
            $data = body();
            Validator::require($data, ['review_text']);
            $stmt = pdo()->prepare(
                'UPDATE reviews SET review_text=:text, status="pending"
                 WHERE id=:id AND (user_id=:user_id OR :is_admin=1)'
            );
            $stmt->execute([
                ':text' => trim((string)$data['review_text']),
                ':id' => $id,
                ':user_id' => $user['id'],
                ':is_admin' => $user['role_code'] === 'LIBRARIAN_ADMIN' ? 1 : 0,
            ]);
            Response::ok(['id' => $id], 'Review updated');
        }
        if ($method === 'DELETE') {
            pdo()->prepare(
                'UPDATE reviews SET status="deleted" WHERE id=:id AND (user_id=:user_id OR :is_admin=1)'
            )->execute([
                ':id' => $id,
                ':user_id' => $user['id'],
                ':is_admin' => $user['role_code'] === 'LIBRARIAN_ADMIN' ? 1 : 0,
            ]);
            Response::ok(['id' => $id], 'Review deleted');
        }
    }

    if ($method === 'POST' && $path === '/reviews') {
        $user = current_user();
        $data = body();
        $bookId = Validator::int($data['book_id'] ?? $data['bookId'] ?? null, 'book_id');
        $text = trim((string)($data['review_text'] ?? $data['text'] ?? ''));
        if ($text === '') {
            Response::error('Review text is required', 422);
        }
        $stmt = pdo()->prepare(
            'INSERT INTO reviews (user_id, book_id, review_text, status) VALUES (:user_id, :book_id, :text, "pending")'
        );
        $stmt->execute([':user_id' => $user['id'], ':book_id' => $bookId, ':text' => $text]);
        $reviewId = (int)pdo()->lastInsertId();
        if (isset($data['rating'])) {
            $rating = bounded_int($data['rating'], 0, 1, 5);
            pdo()->prepare(
                'INSERT INTO ratings (user_id, book_id, rating, status) VALUES (:user_id, :book_id, :rating, "active")
                 ON DUPLICATE KEY UPDATE rating=VALUES(rating), status="active"'
            )->execute([':user_id' => $user['id'], ':book_id' => $bookId, ':rating' => $rating]);
        }
        Response::ok(['id' => $reviewId], 'Review submitted for moderation');
    }

    if (preg_match('#^/reviews/(\d+)/moderate$#', $path, $m) && $method === 'PATCH') {
        $user = current_user();
        require_role($user, admin_roles());
        $data = body();
        $status = (string)($data['status'] ?? '');
        if (!in_array($status, ['approved', 'hidden', 'deleted'], true)) {
            Response::error('Invalid moderation status', 422);
        }
        pdo()->prepare(
            'UPDATE reviews SET status=:status, moderated_by=:moderator, moderated_at=NOW(), moderation_note=:note WHERE id=:id'
        )->execute([
            ':status' => $status,
            ':moderator' => $user['id'],
            ':note' => $data['note'] ?? null,
            ':id' => Validator::int($m[1]),
        ]);
        Response::ok(['id' => (int)$m[1], 'status' => $status], 'Review moderated');
    }

    if ($method === 'GET' && $path === '/recommendations') {
        $user = current_user();
        $stmt = pdo()->prepare(
            book_select_sql() . '
            LEFT JOIN user_profiles up ON up.user_id=:profile_user_id
            LEFT JOIN (
                SELECT book_id, COUNT(*) AS borrow_count
                FROM borrow_requests WHERE status IN ("approved","returned","overdue") GROUP BY book_id
            ) popularity ON popularity.book_id=b.id
            LEFT JOIN recommendations rec ON rec.book_id=b.id AND rec.user_id=:recommendation_user_id AND rec.status="active"
            WHERE b.status="active"
            ORDER BY (
                CASE WHEN b.course_id IS NOT NULL AND b.course_id=up.course_id THEN 40 ELSE 0 END +
                CASE WHEN b.department_id IS NOT NULL AND b.department_id=up.department_id THEN 25 ELSE 0 END +
                CASE WHEN b.faculty_id IS NOT NULL AND b.faculty_id=up.faculty_id THEN 15 ELSE 0 END +
                CASE WHEN EXISTS (
                    SELECT 1 FROM borrow_requests preferred_borrow
                    JOIN books borrowed_book ON borrowed_book.id=preferred_borrow.book_id
                    WHERE preferred_borrow.user_id=:borrow_user_id
                      AND preferred_borrow.status IN ("approved","returned","overdue")
                      AND borrowed_book.category_id=b.category_id
                ) THEN 20 ELSE 0 END +
                CASE WHEN EXISTS (
                    SELECT 1 FROM favorites preferred_favorite
                    JOIN books favorite_book ON favorite_book.id=preferred_favorite.book_id
                    WHERE preferred_favorite.user_id=:favorite_user_id
                      AND preferred_favorite.status="active"
                      AND favorite_book.category_id=b.category_id
                ) THEN 15 ELSE 0 END +
                CASE WHEN EXISTS (
                    SELECT 1 FROM search_logs preferred_search
                    WHERE preferred_search.user_id=:search_user_id
                      AND preferred_search.status <> "failed"
                      AND (b.title LIKE CONCAT("%", preferred_search.query_text, "%")
                           OR b.keywords LIKE CONCAT("%", preferred_search.query_text, "%"))
                ) THEN 15 ELSE 0 END +
                COALESCE(rec.score, 0) + LEAST(COALESCE(popularity.borrow_count, 0), 20)
            ) DESC, b.created_at DESC
            LIMIT 20'
        );
        $stmt->execute([
            ':profile_user_id' => $user['id'],
            ':recommendation_user_id' => $user['id'],
            ':borrow_user_id' => $user['id'],
            ':favorite_user_id' => $user['id'],
            ':search_user_id' => $user['id'],
        ]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'POST' && $path === '/recommendations') {
        $user = current_user();
        require_role($user, ['LECTURER', 'LIBRARIAN_ADMIN']);
        $data = body();
        $bookId = Validator::int($data['book_id'] ?? $data['bookId'] ?? null, 'book_id');
        $targetUser = optional_int($data['user_id'] ?? null, 'user_id');
        $sourceType = (string)($data['source_type'] ?? 'lecturer');
        $allowedSources = ['faculty', 'department', 'course', 'popular', 'search_history', 'borrowed_books', 'favorites', 'lecturer', 'similar'];
        if (!in_array($sourceType, $allowedSources, true)) {
            Response::error('Invalid recommendation source', 422);
        }
        pdo()->prepare(
            'INSERT INTO recommendations (user_id, book_id, source_type, source_id, score, status)
             VALUES (:user_id, :book_id, :source_type, :source_id, :score, "active")'
        )->execute([
            ':user_id' => $targetUser,
            ':book_id' => $bookId,
            ':source_type' => $sourceType,
            ':source_id' => optional_int($data['source_id'] ?? null, 'source_id'),
            ':score' => max(0, (float)($data['score'] ?? 50)),
        ]);
        $recommendationId = (int)pdo()->lastInsertId();
        if ($targetUser) {
            pdo()->prepare(
                'INSERT INTO notifications (user_id, created_by, type, title, message)
                 VALUES (:user_id, :created_by, "lecturer_recommendation", :title, :message)'
            )->execute([
                ':user_id' => $targetUser,
                ':created_by' => $user['id'],
                ':title' => 'New book recommendation',
                ':message' => (string)($data['message'] ?? 'A new book has been recommended for you.'),
            ]);
        }
        Response::ok(['id' => $recommendationId], 'Recommendation created');
    }

    if ($method === 'GET' && $path === '/recommendations/admin') {
        $user = current_user();
        require_role($user, admin_roles());
        $stmt = pdo()->query(
            'SELECT rec.id, rec.user_id, rec.book_id, rec.source_type, rec.source_id, rec.score, rec.status,
                    rec.created_at, b.title AS book_title, u.full_name AS user_name, u.email AS user_email
             FROM recommendations rec
             JOIN books b ON b.id=rec.book_id
             LEFT JOIN users u ON u.id=rec.user_id
             ORDER BY (rec.status="active") DESC, rec.created_at DESC LIMIT 200'
        );
        Response::ok($stmt->fetchAll());
    }

    if (preg_match('#^/recommendations/(\d+)$#', $path, $m) && $method === 'PATCH') {
        $user = current_user();
        require_role($user, admin_roles());
        $data = body();
        $status = (string)($data['status'] ?? '');
        if (!in_array($status, ['active', 'dismissed', 'expired'], true)) {
            Response::error('Invalid recommendation status', 422);
        }
        $id = Validator::int($m[1]);
        pdo()->prepare('UPDATE recommendations SET status=:status WHERE id=:id')
            ->execute([':status' => $status, ':id' => $id]);
        ActivityLogService::log($user, 'update_recommendation', 'success', 'recommendations', $id, ['status' => $status]);
        Response::ok(['id' => $id, 'status' => $status], 'Recommendation updated');
    }

    if ($method === 'GET' && $path === '/notifications') {
        $user = current_user();
        $stmt = pdo()->prepare(
            'SELECT * FROM notifications
             WHERE (user_id=:user_id OR user_id IS NULL) AND status="active" ORDER BY created_at DESC'
        );
        $stmt->execute([':user_id' => $user['id']]);
        Response::ok($stmt->fetchAll());
    }

    if (preg_match('#^/notifications/(\d+)/read$#', $path, $m) && $method === 'PATCH') {
        $user = current_user();
        pdo()->prepare('UPDATE notifications SET read_at=NOW() WHERE id=:id AND user_id=:user_id')->execute([':id' => Validator::int($m[1]), ':user_id' => $user['id']]);
        Response::ok(null, 'Notification marked read');
    }

    if ($method === 'POST' && $path === '/notifications') {
        $user = current_user();
        require_role($user, ['LECTURER', 'LIBRARIAN_ADMIN']);
        $data = body();
        Validator::require($data, ['title', 'message']);
        $type = (string)($data['type'] ?? 'system');
        $allowedTypes = ['new_book', 'borrow_approved', 'borrow_rejected', 'due_date', 'overdue', 'lecturer_recommendation', 'system'];
        if (!in_array($type, $allowedTypes, true)) {
            Response::error('Invalid notification type', 422);
        }
        pdo()->prepare(
            'INSERT INTO notifications (user_id, created_by, type, title, message)
             VALUES (:user_id, :created_by, :type, :title, :message)'
        )->execute([
            ':user_id' => optional_int($data['user_id'] ?? null, 'user_id'),
            ':created_by' => $user['id'],
            ':type' => $type,
            ':title' => trim((string)$data['title']),
            ':message' => trim((string)$data['message']),
        ]);
        Response::ok(['id' => (int)pdo()->lastInsertId()], 'Notification created');
    }

    if (preg_match('#^/notifications/(\d+)$#', $path, $m) && $method === 'DELETE') {
        $user = current_user();
        pdo()->prepare('UPDATE notifications SET status="deleted" WHERE id=:id AND user_id=:user_id')
            ->execute([':id' => Validator::int($m[1]), ':user_id' => $user['id']]);
        Response::ok(null, 'Notification deleted');
    }

    if ($method === 'GET' && $path === '/reading-lists') {
        $user = current_user();
        $courseId = optional_int($_GET['course_id'] ?? null, 'course_id');
        $stmt = pdo()->prepare(
            'SELECT rl.id, rl.title, rl.description, rl.visibility AS status, rl.status AS record_status, rl.created_at, c.name AS course, COUNT(rlb.id) AS books
             FROM reading_lists rl
             JOIN courses c ON c.id=rl.course_id
             LEFT JOIN reading_list_books rlb ON rlb.reading_list_id=rl.id AND rlb.status="active"
             WHERE rl.status="active" AND (:course_filter IS NULL OR rl.course_id=:course_id)
             AND (:is_admin=1 OR rl.lecturer_id=:user_id OR rl.visibility="published")
             GROUP BY rl.id, rl.title, rl.description, rl.visibility, rl.status, rl.created_at, c.name
             ORDER BY rl.created_at DESC'
        );
        $stmt->execute([
            ':course_filter' => $courseId,
            ':course_id' => $courseId,
            ':is_admin' => $user['role_code'] === 'LIBRARIAN_ADMIN' ? 1 : 0,
            ':user_id' => $user['id'],
        ]);
        Response::ok($stmt->fetchAll());
    }

    if (preg_match('#^/reading-lists/(\d+)$#', $path, $m) && $method === 'GET') {
        $user = current_user();
        $list = fetch_reading_list(Validator::int($m[1]));
        if ($user['role_code'] !== 'LIBRARIAN_ADMIN'
            && (int)$list['lecturer_id'] !== (int)$user['id']
            && $list['visibility'] !== 'published') {
            Response::error('You cannot access this reading list', 403);
        }
        $books = pdo()->prepare(
            book_select_sql() . '
             JOIN reading_list_books rlb ON rlb.book_id=b.id AND rlb.status="active"
             WHERE rlb.reading_list_id=:list_id AND b.status="active"
             ORDER BY rlb.sort_order, b.title'
        );
        $books->execute([':list_id' => $list['id']]);
        $notes = pdo()->prepare(
            'SELECT ln.id, ln.title, ln.original_name, ln.mime_type, ln.file_size, ln.status, ln.created_at,
                    c.name AS course
             FROM lecture_notes ln JOIN courses c ON c.id=ln.course_id
             WHERE ln.reading_list_id=:list_id AND ln.status <> "archived"
             ORDER BY ln.created_at DESC'
        );
        $notes->execute([':list_id' => $list['id']]);
        Response::ok(['list' => $list, 'books' => $books->fetchAll(), 'notes' => $notes->fetchAll()]);
    }

    if ($method === 'POST' && $path === '/reading-lists') {
        $user = current_user();
        require_role($user, ['LECTURER', 'LIBRARIAN_ADMIN']);
        $data = body();
        Validator::require($data, ['title']);
        $courseId = optional_int($data['course_id'] ?? null, 'course_id');
        if (!$courseId) {
            $courseStmt = pdo()->prepare(
                'SELECT course_id FROM lecturer_courses
                 WHERE lecturer_id=:assigned_lecturer_id AND status="active"
                 UNION
                 SELECT course_id FROM reading_lists
                 WHERE lecturer_id=:list_lecturer_id AND status="active"
                 LIMIT 1'
            );
            $courseStmt->execute([
                ':assigned_lecturer_id' => $user['id'],
                ':list_lecturer_id' => $user['id'],
            ]);
            $courseId = (int)($courseStmt->fetchColumn() ?: 0);
            if (!$courseId && $user['role_code'] === 'LIBRARIAN_ADMIN') {
                $courseId = (int)(pdo()->query('SELECT id FROM courses WHERE status="active" ORDER BY id LIMIT 1')->fetchColumn() ?: 0);
            }
            if (!$courseId) {
                Response::error('Assign the lecturer to a course or provide course_id', 422);
            }
        }
        pdo()->prepare('INSERT INTO reading_lists (lecturer_id, course_id, title, description, visibility) VALUES (:lecturer_id, :course_id, :title, :description, :visibility)')
            ->execute([':lecturer_id' => $user['id'], ':course_id' => $courseId, ':title' => $data['title'], ':description' => $data['description'] ?? null, ':visibility' => $data['visibility'] ?? 'draft']);
        Response::ok(['id' => (int)pdo()->lastInsertId()], 'Reading list created');
    }

    if (preg_match('#^/reading-lists/(\d+)/books$#', $path, $m) && $method === 'POST') {
        $user = current_user();
        require_role($user, ['LECTURER', 'LIBRARIAN_ADMIN']);
        $list = fetch_reading_list(Validator::int($m[1]));
        require_reading_list_manager($user, $list);
        $data = body();
        $bookId = Validator::int($data['book_id'] ?? null, 'book_id');
        $requirement = (string)($data['requirement_type'] ?? 'recommended');
        if (!in_array($requirement, ['required', 'recommended', 'optional'], true)) {
            Response::error('Invalid requirement type', 422);
        }
        pdo()->prepare(
            'INSERT INTO reading_list_books (reading_list_id, book_id, requirement_type, sort_order, status)
             VALUES (:list_id, :book_id, :requirement, :sort_order, "active")
             ON DUPLICATE KEY UPDATE requirement_type=VALUES(requirement_type), sort_order=VALUES(sort_order), status="active"'
        )->execute([
            ':list_id' => $list['id'],
            ':book_id' => $bookId,
            ':requirement' => $requirement,
            ':sort_order' => max(0, (int)($data['sort_order'] ?? 0)),
        ]);
        Response::ok(['reading_list_id' => (int)$list['id'], 'book_id' => $bookId], 'Book added to reading list');
    }

    if (preg_match('#^/reading-lists/(\d+)/books/(\d+)$#', $path, $m) && $method === 'DELETE') {
        $user = current_user();
        require_role($user, ['LECTURER', 'LIBRARIAN_ADMIN']);
        $list = fetch_reading_list(Validator::int($m[1]));
        require_reading_list_manager($user, $list);
        pdo()->prepare(
            'UPDATE reading_list_books SET status="removed" WHERE reading_list_id=:list_id AND book_id=:book_id'
        )->execute([':list_id' => $list['id'], ':book_id' => Validator::int($m[2], 'book_id')]);
        Response::ok(null, 'Book removed from reading list');
    }

    if ($method === 'POST' && $path === '/lecture-notes') {
        $user = current_user();
        require_role($user, ['LECTURER', 'LIBRARIAN_ADMIN']);
        if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
            Response::error('Lecture note file is required', 422);
        }
        $courseId = Validator::int($_POST['course_id'] ?? null, 'course_id');
        $listId = optional_int($_POST['reading_list_id'] ?? null, 'reading_list_id');
        if ($listId) {
            $list = fetch_reading_list($listId);
            require_reading_list_manager($user, $list);
        }
        $file = $_FILES['file'];
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            Response::error('The lecture note upload did not complete successfully', 422);
        }
        if ((int)($file['size'] ?? 0) > 25 * 1024 * 1024) {
            Response::error('Lecture notes must be 25 MB or smaller', 422);
        }
        $noteExtension = strtolower(pathinfo((string)($file['name'] ?? ''), PATHINFO_EXTENSION));
        if (!in_array($noteExtension, ['pdf', 'docx', 'txt'], true)) {
            Response::error('Lecture notes must be PDF, DOCX, or TXT files', 422);
        }
        $extension = safe_upload_extension($file['name'] ?? '');
        $notesRoot = (__DIR__ . '/../uploads/lecture-notes');
        if (!is_dir($notesRoot)) {
            mkdir($notesRoot, 0775, true);
        }
        $storedName = bin2hex(random_bytes(12)) . '.' . $extension;
        $target = $notesRoot . DIRECTORY_SEPARATOR . $storedName;
        if (!move_uploaded_file($file['tmp_name'], $target)) {
            Response::error('Could not store lecture note', 500);
        }
        pdo()->prepare(
            'INSERT INTO lecture_notes
             (reading_list_id, lecturer_id, course_id, title, file_path, original_name, mime_type, file_size)
             VALUES (:list_id, :lecturer_id, :course_id, :title, :path, :original_name, :mime_type, :file_size)'
        )->execute([
            ':list_id' => $listId,
            ':lecturer_id' => $user['id'],
            ':course_id' => $courseId,
            ':title' => trim((string)($_POST['title'] ?? pathinfo($file['name'], PATHINFO_FILENAME))),
            ':path' => 'uploads/lecture-notes/' . $storedName,
            ':original_name' => $file['name'] ?? $storedName,
            ':mime_type' => $file['type'] ?? null,
            ':file_size' => (int)($file['size'] ?? 0),
        ]);
        Response::ok(['id' => (int)pdo()->lastInsertId()], 'Lecture note uploaded');
    }

    if ($method === 'GET' && $path === '/lecture-notes') {
        $user = current_user();
        $conditions = ['ln.status <> "archived"'];
        $params = [];
        if ($user['role_code'] === 'LECTURER') {
            $conditions[] = 'ln.lecturer_id=:lecturer_id';
            $params[':lecturer_id'] = $user['id'];
        } elseif ($user['role_code'] !== 'LIBRARIAN_ADMIN') {
            $conditions[] = 'ln.status="approved"';
        }
        if (!empty($_GET['course_id'])) {
            $conditions[] = 'ln.course_id=:course_id';
            $params[':course_id'] = Validator::int($_GET['course_id'], 'course_id');
        }
        $stmt = pdo()->prepare(
            'SELECT ln.id, ln.reading_list_id, ln.lecturer_id, ln.course_id, ln.title, ln.original_name,
                    ln.mime_type, ln.file_size, ln.status, ln.created_at, c.name AS course,
                    u.full_name AS lecturer_name
             FROM lecture_notes ln
             JOIN courses c ON c.id=ln.course_id
             JOIN users u ON u.id=ln.lecturer_id
             WHERE ' . implode(' AND ', $conditions) . ' ORDER BY ln.created_at DESC'
        );
        $stmt->execute($params);
        Response::ok($stmt->fetchAll());
    }

    if (preg_match('#^/lecture-notes/(\d+)/download$#', $path, $m) && $method === 'GET') {
        $user = current_user();
        $stmt = pdo()->prepare('SELECT * FROM lecture_notes WHERE id=:id AND status <> "archived" LIMIT 1');
        $stmt->execute([':id' => Validator::int($m[1])]);
        $note = $stmt->fetch();
        if (!$note) {
            Response::error('Lecture note not found', 404);
        }
        if ($user['role_code'] !== 'LIBRARIAN_ADMIN'
            && (int)$note['lecturer_id'] !== (int)$user['id']
            && $note['status'] !== 'approved') {
            Response::error('This lecture note has not been approved', 403);
        }
        serve_stored_file(resolve_stored_upload($note));
    }

    if (preg_match('#^/lecture-notes/(\d+)/moderate$#', $path, $m) && $method === 'PATCH') {
        $user = current_user();
        require_role($user, admin_roles());
        $status = (string)(body()['status'] ?? '');
        if (!in_array($status, ['approved', 'rejected', 'archived'], true)) {
            Response::error('Invalid lecture note status', 422);
        }
        $id = Validator::int($m[1]);
        pdo()->prepare('UPDATE lecture_notes SET status=:status WHERE id=:id')
            ->execute([':status' => $status, ':id' => $id]);
        ActivityLogService::log($user, 'moderate_lecture_note', 'success', 'lecture_notes', $id, ['status' => $status]);
        Response::ok(['id' => $id, 'status' => $status], 'Lecture note updated');
    }

    if ($method === 'GET' && $path === '/lecturer/resources') {
        $user = current_user();
        require_role($user, ['LECTURER', 'LIBRARIAN_ADMIN']);
        $lecturerId = $user['role_code'] === 'LIBRARIAN_ADMIN'
            ? optional_int($_GET['lecturer_id'] ?? null, 'lecturer_id')
            : (int)$user['id'];
        if (!$lecturerId) {
            Response::ok(['courses' => [], 'books' => [], 'notes' => []]);
        }
        $courses = pdo()->prepare(
            'SELECT c.id, c.name, c.code, d.name AS department
             FROM lecturer_courses lc
             JOIN courses c ON c.id=lc.course_id
             JOIN departments d ON d.id=c.department_id
             WHERE lc.lecturer_id=:lecturer_id AND lc.status="active" AND c.status="active"
             ORDER BY c.name'
        );
        $courses->execute([':lecturer_id' => $lecturerId]);
        $books = pdo()->prepare(
            book_select_sql() . '
             JOIN book_courses bc ON bc.book_id=b.id AND bc.status="active"
             JOIN lecturer_courses lc ON lc.course_id=bc.course_id AND lc.status="active"
             WHERE lc.lecturer_id=:lecturer_id AND b.status="active" ORDER BY b.title'
        );
        $books->execute([':lecturer_id' => $lecturerId]);
        $notes = pdo()->prepare(
            'SELECT ln.id, ln.title, ln.original_name, ln.status, ln.created_at, c.name AS course
             FROM lecture_notes ln JOIN courses c ON c.id=ln.course_id
             WHERE ln.lecturer_id=:lecturer_id AND ln.status <> "archived" ORDER BY ln.created_at DESC'
        );
        $notes->execute([':lecturer_id' => $lecturerId]);
        Response::ok(['courses' => $courses->fetchAll(), 'books' => $books->fetchAll(), 'notes' => $notes->fetchAll()]);
    }

    if ($method === 'GET' && $path === '/lecturer/engagement') {
        $user = current_user();
        require_role($user, ['LECTURER']);
        $params = [':lecturer_id' => $user['id']];
        $courseStats = pdo()->prepare(
            'SELECT c.id, c.name AS course,
                    COUNT(DISTINCT up.user_id) AS enrolled_students,
                    COUNT(DISTINCT rp.user_id) AS active_readers,
                    COUNT(DISTINCT br.id) AS borrow_actions,
                    ROUND(COALESCE(AVG(rp.progress_percentage), 0), 1) AS average_progress
             FROM lecturer_courses lc
             JOIN courses c ON c.id=lc.course_id
             LEFT JOIN user_profiles up ON up.course_id=c.id AND up.status="active"
             LEFT JOIN reading_progress rp ON rp.user_id=up.user_id AND rp.status="active"
             LEFT JOIN books b ON b.course_id=c.id
             LEFT JOIN borrow_requests br ON br.book_id=b.id AND br.user_id=up.user_id
             WHERE lc.lecturer_id=:lecturer_id AND lc.status="active"
             GROUP BY c.id, c.name ORDER BY c.name'
        );
        $courseStats->execute($params);
        $recent = pdo()->prepare(
            'SELECT al.action, al.entity_type, al.entity_id, al.created_at, u.full_name AS student
             FROM activity_logs al
             JOIN users u ON u.id=al.user_id
             JOIN user_profiles up ON up.user_id=u.id
             JOIN lecturer_courses lc ON lc.course_id=up.course_id AND lc.status="active"
             WHERE lc.lecturer_id=:lecturer_id AND al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             ORDER BY al.created_at DESC LIMIT 100'
        );
        $recent->execute($params);
        Response::ok(['courses' => $courseStats->fetchAll(), 'recent_activity' => $recent->fetchAll()]);
    }

    if ($method === 'GET' && $path === '/analytics') {
        $user = current_user();
        require_role($user, admin_roles());
        $data = [
            'totalUsers' => (int)pdo()->query("SELECT COUNT(*) FROM users WHERE status='active'")->fetchColumn(),
            'totalBooks' => (int)pdo()->query("SELECT COUNT(*) FROM books WHERE status='active'")->fetchColumn(),
            'borrowedBooks' => (int)pdo()->query("SELECT COUNT(*) FROM borrow_requests WHERE status='approved'")->fetchColumn(),
            'availableBooks' => (int)pdo()->query("SELECT COALESCE(SUM(available_copies),0) FROM books WHERE status='active'")->fetchColumn(),
            'overdueBooks' => (int)pdo()->query("SELECT COUNT(*) FROM borrow_requests WHERE status='approved' AND due_date < CURDATE()")->fetchColumn(),
            'voiceSearches' => (int)pdo()->query("SELECT COUNT(*) FROM voice_search_logs")->fetchColumn(),
            'ttsPlays' => (int)pdo()->query("SELECT COUNT(*) FROM tts_logs")->fetchColumn(),
        ];
        Response::ok($data);
    }

    if ($method === 'GET' && $path === '/analytics/top') {
        $user = current_user();
        require_role($user, admin_roles());
        Response::ok([
            'mostSearchedBooks' => pdo()->query(
                'SELECT query_text, COUNT(*) AS searches FROM search_logs
                 WHERE status <> "failed" GROUP BY query_text ORDER BY searches DESC LIMIT 10'
            )->fetchAll(),
            'mostBorrowedBooks' => pdo()->query(
                'SELECT b.id, b.title, COUNT(*) AS borrow_count FROM borrow_requests br
                 JOIN books b ON b.id=br.book_id WHERE br.status IN ("approved","returned","overdue")
                 GROUP BY b.id, b.title ORDER BY borrow_count DESC LIMIT 10'
            )->fetchAll(),
            'mostActiveUsers' => pdo()->query(
                'SELECT u.id, u.full_name, COUNT(*) AS activity_count FROM activity_logs al
                 JOIN users u ON u.id=al.user_id GROUP BY u.id, u.full_name ORDER BY activity_count DESC LIMIT 10'
            )->fetchAll(),
        ]);
    }

    if ($method === 'GET' && $path === '/logs/activity') {
        $user = current_user();
        require_role($user, admin_roles());
        $conditions = [];
        $params = [];
        if (!empty($_GET['user_id'])) {
            $conditions[] = 'al.user_id=:user_id';
            $params[':user_id'] = Validator::int($_GET['user_id'], 'user_id');
        }
        if (!empty($_GET['from'])) {
            $conditions[] = 'al.created_at >= :from_date';
            $params[':from_date'] = $_GET['from'] . ' 00:00:00';
        }
        if (!empty($_GET['to'])) {
            $conditions[] = 'al.created_at <= :to_date';
            $params[':to_date'] = $_GET['to'] . ' 23:59:59';
        }
        $sql = 'SELECT al.*, COALESCE(u.full_name, "System") AS actor, r.code AS role_code
                FROM activity_logs al
                LEFT JOIN users u ON u.id=al.user_id
                LEFT JOIN roles r ON r.id=u.role_id' .
            ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '') .
            ' ORDER BY al.created_at DESC LIMIT 200';
        $stmt = pdo()->prepare($sql);
        $stmt->execute($params);
        Response::ok($stmt->fetchAll());
    }

    if (preg_match('#^/logs/(security|search|voice|tts)$#', $path, $m) && $method === 'GET') {
        $user = current_user();
        require_role($user, admin_roles());
        $table = match ($m[1]) {
            'security' => 'security_logs',
            'search' => 'search_logs',
            'voice' => 'voice_search_logs',
            default => 'tts_logs',
        };
        $conditions = [];
        $params = [];
        if (!empty($_GET['user_id'])) {
            $conditions[] = 'user_id=:user_id';
            $params[':user_id'] = Validator::int($_GET['user_id'], 'user_id');
        }
        if (!empty($_GET['from'])) {
            $conditions[] = 'created_at >= :from_date';
            $params[':from_date'] = $_GET['from'] . ' 00:00:00';
        }
        if (!empty($_GET['to'])) {
            $conditions[] = 'created_at <= :to_date';
            $params[':to_date'] = $_GET['to'] . ' 23:59:59';
        }
        $sql = "SELECT * FROM {$table}" . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '') .
            ' ORDER BY created_at DESC LIMIT :limit';
        $stmt = pdo()->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', bounded_int($_GET['limit'] ?? null, 100, 1, 500), PDO::PARAM_INT);
        $stmt->execute();
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'GET' && $path === '/voice-search/logs') {
        $user = current_user();
        $stmt = pdo()->prepare(
            'SELECT * FROM voice_search_logs WHERE user_id=:user_id ORDER BY created_at DESC LIMIT 100'
        );
        $stmt->execute([':user_id' => $user['id']]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'GET' && $path === '/tts/logs') {
        $user = current_user();
        $stmt = pdo()->prepare('SELECT * FROM tts_logs WHERE user_id=:user_id ORDER BY created_at DESC LIMIT 100');
        $stmt->execute([':user_id' => $user['id']]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'POST' && $path === '/logs/activity') {
        $user = current_user();
        $data = body();
        Validator::require($data, ['action']);
        ActivityLogService::log(
            $user,
            trim((string)$data['action']),
            in_array(($data['status'] ?? 'success'), ['success', 'failed', 'warning'], true) ? $data['status'] : 'success',
            $data['entity_type'] ?? null,
            optional_int($data['entity_id'] ?? null, 'entity_id'),
            is_array($data['metadata'] ?? null) ? $data['metadata'] : []
        );
        Response::ok(null, 'Activity logged');
    }

    if ($method === 'POST' && $path === '/logs/security') {
        $user = current_user(false);
        $data = body();
        Validator::require($data, ['event_type']);
        $severity = (string)($data['severity'] ?? 'low');
        if (!in_array($severity, ['low', 'medium', 'high', 'critical'], true)) {
            Response::error('Invalid severity', 422);
        }
        pdo()->prepare(
            'INSERT INTO security_logs (user_id, event_type, severity, ip_address, user_agent, details)
             VALUES (:user_id, :event_type, :severity, :ip, :user_agent, :details)'
        )->execute([
            ':user_id' => $user['id'] ?? null,
            ':event_type' => trim((string)$data['event_type']),
            ':severity' => $severity,
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            ':user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
            ':details' => $data['details'] ?? null,
        ]);
        Response::ok(['id' => (int)pdo()->lastInsertId()], 'Security event logged');
    }

    if ($method === 'GET' && $path === '/settings') {
        $user = current_user(false);
        $isAdmin = $user && $user['role_code'] === 'LIBRARIAN_ADMIN';
        $stmt = pdo()->prepare(
            'SELECT setting_key, setting_value, value_type, description, is_public
             FROM system_settings WHERE status="active" AND (:is_admin=1 OR is_public=1) ORDER BY setting_key'
        );
        $stmt->execute([':is_admin' => $isAdmin ? 1 : 0]);
        Response::ok($stmt->fetchAll());
    }

    if ($method === 'PUT' && $path === '/settings') {
        $user = current_user();
        require_role($user, admin_roles());
        foreach (body() as $key => $value) {
            pdo()->prepare('INSERT INTO system_settings (setting_key, setting_value) VALUES (:k, :v) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)')
                ->execute([':k' => $key, ':v' => is_scalar($value) ? (string)$value : json_encode($value)]);
        }
        Response::ok(null, 'Settings updated');
    }

    if ($method === 'GET' && $path === '/ai/models') {
        current_user();
        Response::ok(ai_model_status());
    }

    if ($method === 'POST' && $path === '/voice-search/search') {
        enforce_rate_limit('voice-search', 30, 300);
        $user = current_user();
        $transcript = trim($_POST['transcript'] ?? '');
        $stt = null;
        $aiStatus = $transcript === '' ? 'awaiting_audio' : 'manual_transcript';

        if ($transcript === '' && isset($_FILES['audio'])) {
            $stt = local_open_vocabulary_transcribe($_FILES['audio']);
            if ($stt) {
                $transcript = trim((string)($stt['transcription'] ?? $stt['predicted_text'] ?? $stt['text'] ?? ''));
                $confidence = (float)($stt['confidence'] ?? 0);
                $aiStatus = $transcript === ''
                    ? 'empty_transcript'
                    : ($confidence > 0 && $confidence < 0.2 ? 'stt_low_confidence' : 'whisper_success');
            } else {
                $aiStatus = 'open_vocabulary_stt_unavailable';
            }
        }

        $rows = [];
        $action = $transcript !== '' ? interpret_library_action($transcript) : null;
        if (!$action && $transcript !== '' && strlen($transcript) >= 2 && $aiStatus !== 'stt_low_confidence') {
            $parsedQuery = parse_catalog_query($transcript);
            $terms = $parsedQuery['keywords'] !== '' ? $parsedQuery['keywords'] : $transcript;
            $like = "%{$terms}%";
            $authorLike = '%' . ($parsedQuery['author'] !== '' ? $parsedQuery['author'] : $terms) . '%';
            $availabilitySql = match ($parsedQuery['availability']) {
                'available' => ' AND b.available_copies > 0',
                'unavailable' => ' AND b.available_copies = 0',
                default => '',
            };
            $stmt = pdo()->prepare(
                book_select_sql() . ' WHERE b.status="active"
                 AND (b.title LIKE :title_q OR a.full_name LIKE :author_q OR b.keywords LIKE :keywords_q
                      OR b.description LIKE :description_q OR cat.name LIKE :category_q
                      OR c.name LIKE :course_q OR d.name LIKE :department_q OR f.name LIKE :faculty_q)' .
                 $availabilitySql . '
                 ORDER BY CASE WHEN b.title LIKE :rank_title THEN 1 WHEN a.full_name LIKE :rank_author THEN 2 ELSE 3 END,
                          b.created_at DESC LIMIT 20'
            );
            $stmt->execute([
                ':title_q' => $like,
                ':author_q' => $authorLike,
                ':keywords_q' => $like,
                ':description_q' => $like,
                ':category_q' => $like,
                ':course_q' => $like,
                ':department_q' => $like,
                ':faculty_q' => $like,
                ':rank_title' => $like,
                ':rank_author' => $authorLike,
            ]);
            $rows = $stmt->fetchAll();
        }
        pdo()->prepare('INSERT INTO voice_search_logs (user_id, transcript, results_count, status) VALUES (:user_id, :transcript, :count, :status)')
            ->execute([
                ':user_id' => $user['id'],
                ':transcript' => $transcript,
                ':count' => count($rows),
                ':status' => normalize_log_status(
                    $transcript === '' ? 'empty_transcript' : ($aiStatus === 'open_vocabulary_stt_unavailable' ? 'failed' : 'success')
                ),
            ]);
        Response::ok([
            'transcript' => $transcript,
            'parsed_query' => $transcript !== '' ? parse_catalog_query($transcript) : null,
            'action' => $action,
            'results' => $rows,
            'ai_status' => $aiStatus,
            'stt' => $stt,
        ]);
    }

    if (preg_match('#^/tts/audio/([a-f0-9]{64}\.mp3)$#', $path, $m) && $method === 'GET') {
        $user = current_user();
        $file = [
            'file_path' => 'uploads/tts/' . (int)$user['id'] . '/' . $m[1],
            'original_name' => 'ines-library-narration.mp3',
            'mime_type' => 'audio/mpeg',
        ];
        serve_stored_file(resolve_stored_upload($file), true);
    }

    if ($method === 'POST' && in_array($path, ['/tts', '/tts/generate', '/tts/read-book', '/tts/read-summary'], true)) {
        enforce_rate_limit('tts', 60, 300);
        $user = current_user();
        $data = body();
        $text = trim((string)($data['text'] ?? ''));
        $audio = generate_gtts_audio($user, $text, (string)($data['language'] ?? 'en'));
        pdo()->prepare('INSERT INTO tts_logs (user_id, book_id, text_length, provider, status) VALUES (:user_id, :book_id, :text_length, :provider, "success")')
            ->execute([
                ':user_id' => $user['id'],
                ':book_id' => optional_int($data['book_id'] ?? null, 'book_id'),
                ':text_length' => mb_strlen($text),
                ':provider' => 'gtts',
            ]);
        Response::ok([
            'audio_url' => '/tts/audio/' . $audio['filename'],
            'text_length' => mb_strlen($text),
            'provider' => 'gtts',
            'file_size' => $audio['file_size'],
        ], 'gTTS narration generated');
    }

    if (str_starts_with($path, '/reports/')) {
        $user = current_user();
        require_role($user, admin_roles());
        $report = basename($path);
        $report = match ($report) {
            'book-inventory', 'inventory' => 'books',
            'user-activity' => 'activity',
            default => $report,
        };
        $map = [
            'books' => 'SELECT b.title, b.isbn, b.total_copies, b.available_copies, b.status FROM books b ORDER BY b.title',
            'borrowing' => 'SELECT br.*, u.full_name, b.title FROM borrow_requests br JOIN users u ON u.id=br.user_id JOIN books b ON b.id=br.book_id ORDER BY br.created_at DESC',
            'users' => 'SELECT u.full_name, u.email, r.code AS role_code, u.status FROM users u JOIN roles r ON r.id=u.role_id',
            'overdue' => 'SELECT br.*, u.full_name, b.title FROM borrow_requests br JOIN users u ON u.id=br.user_id JOIN books b ON b.id=br.book_id WHERE br.status IN ("approved","overdue") AND br.due_date < CURDATE() ORDER BY br.due_date',
            'voice-search' => 'SELECT * FROM voice_search_logs ORDER BY created_at DESC',
            'tts' => 'SELECT * FROM tts_logs ORDER BY created_at DESC',
            'activity' => 'SELECT * FROM activity_logs ORDER BY created_at DESC',
        ];
        if (!isset($map[$report])) {
            Response::error('Unknown report', 404);
        }
        Response::ok(pdo()->query($map[$report])->fetchAll());
    }

    Response::error('Endpoint not found', 404);
}

try {
    route($method, $path);
} catch (PDOException $e) {
    error_log('[INES backend database] ' . $e->getMessage());
    Response::error('Database error. Check backend logs and database setup.', 500);
} catch (Throwable $e) {
    error_log('[INES backend server] ' . $e->getMessage());
    Response::error('Server error. Check backend logs.', 500);
}
