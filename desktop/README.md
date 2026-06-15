# INES Digital Library Desktop App

The desktop application is an Electron shell around the existing React
frontend. It uses the same authenticated PHP API, MySQL database, uploads,
roles, book reader, narration, and speech-to-text services as the browser app.

## Run from source

```powershell
npm.cmd run desktop
```

## Build the Windows app folder

```powershell
npm.cmd run desktop:package
```

The executable and its required files are created in
`desktop/release/win-unpacked/`.

To create an optional single-file portable wrapper, run:

```powershell
npm.cmd run desktop:portable
```

## Runtime requirements

- The project remains installed at `C:\xampp\htdocs\digital-library`, or the
  `INES_PROJECT_ROOT` environment variable points to its location.
- XAMPP Apache and MySQL are installed. The app attempts to start both when the
  backend is not already reachable.
- Python and the model dependencies used by `scripts/start_ai_services.ps1`
  remain installed for microphone speech-to-text.
