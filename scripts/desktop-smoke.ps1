param(
  [string]$ExePath = "apps/desktop-tauri/src-tauri/target/release/desktop-tauri.exe"
)

if (!(Test-Path $ExePath)) {
  Write-Error "Desktop binary not found at $ExePath"
  exit 1
}

Start-Process -FilePath $ExePath
Start-Sleep -Seconds 5
Write-Output "Desktop smoke launch attempted successfully."
