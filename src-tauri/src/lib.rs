use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn open_isolated_webview(app: tauri::AppHandle, account_id: String, url: String) {
    let mut data_path = app.path().app_data_dir().unwrap();
    data_path.push(format!("sessions/account_{}", account_id));

    let label = format!("account-{}", account_id);

    // If window already exists, show and focus it
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    WebviewWindowBuilder::new(&app, label, WebviewUrl::External(url.parse().unwrap()))
        .data_directory(data_path)
        .decorations(false)
        .inner_size(1200.0, 800.0) // Match main window dimensions
        .build()
        .unwrap();
}

#[tauri::command]
async fn hide_isolated_webview(app: tauri::AppHandle, account_id: String) {
    let label = format!("account-{}", account_id);
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.hide();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            open_isolated_webview,
            hide_isolated_webview
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
