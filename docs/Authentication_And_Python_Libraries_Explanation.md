# Authentication and Python Library Explanation

This note explains where authentication happens in the INES Digital Library project and why the Python libraries are used. It is written for defense preparation, so it focuses on what each part does and where it is located.

## 1. Where Authentication Is Done

Authentication is handled by both the frontend and backend.

### Frontend authentication files

- `frontend/src/api/auth.js`
  - Sends login, registration, logout, current-user, and password reset requests to the backend.
  - Example: the login form calls `/auth/login`.

- `frontend/src/context/AuthContext.jsx`
  - Keeps the current logged-in user in React state.
  - Stores the login token in browser local storage using the key `ines_token`.
  - Provides `login()`, `logout()`, `isAuthenticated`, and `canAccess()`.

- `frontend/src/api/client.js`
  - Adds the saved token to backend requests:
    `Authorization: Bearer <token>`.
  - If the backend returns `401 Unauthorized`, the frontend clears the invalid session.

- `frontend/src/routes/ProtectedRoute.jsx`
  - Blocks pages when the user is not logged in.
  - Blocks pages when the logged-in user does not have the required role.

- `frontend/src/App.jsx`
  - Defines which pages require which roles.
  - Student pages require `STUDENT`.
  - Lecturer pages require `LECTURER`.
  - Admin pages require `LIBRARIAN_ADMIN`.

### Backend authentication files

- `backend/routes/api.php`
  - Contains the `/auth/register`, `/auth/login`, `/auth/me`, `/auth/logout`, password reset, and password change endpoints.
  - During registration, PHP stores a hashed password using `password_hash()`.
  - During login, PHP checks the password using `password_verify()`.
  - If login succeeds, the backend creates a random token with `random_bytes()`.
  - The backend stores only the SHA-256 hash of the token in the `users.api_token_hash` column.
  - The raw token is returned to the frontend once, then the frontend sends it with later requests.

- `backend/middleware/auth.php`
  - Reads the Bearer token from the request.
  - Hashes the received token using SHA-256.
  - Looks for that hash in the `users` table.
  - Rejects the request if the token is missing, expired, invalid, or belongs to an inactive user.

- `backend/middleware/role.php`
  - Checks whether the authenticated user has the required role.
  - Returns `403 Forbidden` if the user is logged in but does not have permission.

- `backend/helpers/Request.php`
  - Extracts the Bearer token from the HTTP `Authorization` header.

## 2. Authentication Flow

1. The user enters email and password in the React login page.
2. React calls the PHP backend endpoint `/auth/login`.
3. PHP finds the user by email in MySQL.
4. PHP checks the password with `password_verify()`.
5. PHP creates a secure random token.
6. PHP stores the hashed token in MySQL and returns the raw token to React.
7. React stores the token as `ines_token` in local storage.
8. Later requests include `Authorization: Bearer <token>`.
9. PHP checks the token before allowing protected actions.
10. Role middleware checks whether the user is allowed to access that action.

## 3. Why PyTorch Is Used

PyTorch is the deep learning engine used by the speech models. It provides tensors, model loading, GPU/CPU execution, and the forward pass that produces predictions.

In this project, PyTorch is needed because Wav2Vec2 and SpeechT5 are neural network models. The Hugging Face Transformers library gives us the model classes, but PyTorch performs the actual computation.

Without PyTorch:

- Wav2Vec2 speech-to-text cannot run.
- SpeechT5 text-to-speech cannot generate audio.
- Fine-tuning or evaluation scripts cannot train or test transformer models.
- Model warm-up checks cannot prove the speech model is ready.

## 4. Why The Main Python Libraries Are Used

| Library | Where it is used | Purpose |
|---|---|---|
| `torch` / PyTorch | `scripts/transformer_speech_service.py`, `scripts/transformer_train_complete.py`, `scripts/speecht5_synthesize.py`, `scripts/whisper_stt_service.py` | Runs deep learning models for STT, TTS, and training/evaluation. |
| `transformers` | Speech and training scripts | Loads Wav2Vec2, SpeechT5, processors, tokenizers, and vocoders. |
| `fastapi` | Python speech services | Creates HTTP APIs so PHP can call Python speech services. |
| `uvicorn` | Python speech services | Runs FastAPI services as local web servers. |
| `librosa` | STT/training scripts | Loads, resamples, and normalizes audio to the required sample rate. |
| `soundfile` | STT scripts | Reads and writes WAV audio files. |
| `numpy` | Speech scripts | Handles audio arrays and numerical operations. |
| `scipy` | SpeechT5 scripts | Writes generated waveform audio as WAV files. |
| `datasets` | SpeechT5 and training scripts | Loads external datasets or speaker embeddings used by SpeechT5. |
| `scikit-learn` | Training/evaluation script | Calculates evaluation metrics such as ROC-AUC. |
| `openai-whisper` / `whisper` | Whisper fallback STT service | Provides an alternative speech-to-text engine. |
| `gTTS` | `scripts/gtts_synthesize.py` | Generates clearer cloud-based Google text-to-speech audio. |
| `pydantic` | FastAPI TTS service | Validates API request data before synthesis. |
| `PyPDF2` | Document pipeline | Extracts text and metadata from PDFs. |
| `PyMuPDF` / `fitz` | Document and cover extraction scripts | Reads PDF pages and creates preview/cover images. |
| `Pillow` | Cover/image scripts | Handles image conversion and processing. |
| `reportlab` | Document pipeline | Generates PDF outputs or document assets. |

## 5. Why These Dependencies Matter

The project uses different libraries because each part of the system has a different job.

- React and Vite build the frontend interface.
- PHP provides the main backend API.
- PDO connects PHP safely to MySQL.
- MySQL stores users, books, borrowing records, reading progress, reviews, and system data.
- FastAPI exposes Python speech services to the PHP backend.
- PyTorch and Transformers run the AI speech models.
- Audio libraries prepare files in the correct format for model inference.
- PDF/image libraries help extract book text, covers, and document content.

## 6. Defense Answer

If asked why PyTorch was necessary, answer:

"PyTorch was used because the speech-to-text and text-to-speech features depend on transformer neural network models. Hugging Face provides Wav2Vec2 and SpeechT5 model classes, but PyTorch performs the actual deep learning computation, model loading, inference, warm-up, and evaluation. Therefore, PyTorch is the runtime engine behind the AI speech features."

If asked where authentication is implemented, answer:

"Authentication starts in the React frontend, where the user submits login credentials. The PHP backend verifies the password, creates a secure token, stores only its hash in MySQL, and returns the token to the frontend. The frontend sends that token as a Bearer token for later requests. The PHP middleware checks the token and role middleware controls whether the user can access student, lecturer, or admin functions."
