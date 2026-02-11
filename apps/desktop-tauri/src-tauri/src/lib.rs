mod update_check;

#[tauri::command]
async fn check_update() -> Result<Option<String>, String> {
    let current = env!("CARGO_PKG_VERSION");
    let api_url = "https://api.github.com/repos/OWNER/REPO/releases/latest";
    let info = update_check::check_for_update(current, api_url).await?;
    if info.has_update {
        return Ok(info.release_url);
    }
    Ok(None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![check_update])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
