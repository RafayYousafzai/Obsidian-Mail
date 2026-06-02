use tauri::{AppHandle, Emitter, Manager, WebviewUrl};
use tauri::webview::WebviewBuilder;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn open_isolated_webview(app: AppHandle, account_id: String, url: String) {
    let main_window = app.get_window("main").unwrap();
    let label = format!("account-{}", account_id);

    // Resolve unique data path
    let mut data_path = app.path().app_data_dir().unwrap();
    data_path.push(format!("sessions/account_{}", account_id));

    // If webview already exists, show and focus it
    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.show();
        let _ = webview.set_focus();
        return;
    }

    // Build the child webview with initialization script to intercept keys
    let webview_builder = WebviewBuilder::new(&label, WebviewUrl::External(url.parse().unwrap()))
        .data_directory(data_path)
        .initialization_script(r#"
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' || (e.ctrlKey && e.key.toLowerCase() === 'h')) {
                    if (window.ipc && typeof window.ipc.postMessage === 'function') {
                        window.ipc.postMessage(JSON.stringify({
                            cmd: 'go_home_command',
                            callback: 0,
                            error: 0
                        }));
                    }
                }
            });
        "#);

    // Add it as a child of the main window
    let size = main_window.inner_size().unwrap();
    let scale_factor = main_window.scale_factor().unwrap_or(1.0);
    // Default to full window height minus a 70px logical bezel at the bottom
    let gap_size = (70.0 * scale_factor) as u32;
    let child_height = if size.height > gap_size { size.height - gap_size } else { size.height };

    let _child = main_window.add_child(
        webview_builder,
        tauri::PhysicalPosition::new(0, 0),
        tauri::PhysicalSize::new(size.width, child_height),
    ).unwrap();
}

#[tauri::command]
async fn hide_isolated_webview(app: AppHandle, account_id: String) {
    let label = format!("account-{}", account_id);
    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.hide();
    }
}

#[tauri::command]
async fn resize_isolated_webview(app: AppHandle, account_id: String, width: u32, height: u32) {
    let main_window = app.get_window("main").unwrap();
    let label = format!("account-{}", account_id);
    if let Some(webview) = app.get_webview(&label) {
        let scale_factor = main_window.scale_factor().unwrap_or(1.0);
        let physical_width = (width as f64 * scale_factor) as u32;
        let physical_height = (height as f64 * scale_factor) as u32;
        
        let physical_gap = (70.0 * scale_factor) as u32;
        let child_height = if physical_height > physical_gap { physical_height - physical_gap } else { physical_height };

        let _ = webview.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(physical_width, child_height)));
    }
}

#[tauri::command]
async fn go_home_command(app: AppHandle) {
    let _ = app.emit("go-home", ());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            open_isolated_webview,
            hide_isolated_webview,
            resize_isolated_webview,
            go_home_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
