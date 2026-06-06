use std::sync::atomic::{AtomicBool, Ordering};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl};
use tauri::webview::WebviewBuilder;

struct AppState {
    minimize_to_tray: AtomicBool,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_minimize_to_tray(state: State<'_, AppState>, enabled: bool) {
    state.minimize_to_tray.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
async fn clear_account_cache(app: AppHandle, account_id: String) -> Result<(), String> {
    let mut data_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    data_path.push(format!("sessions/account_{}", account_id));
    if data_path.exists() {
        std::fs::remove_dir_all(&data_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn clear_all_cache(app: AppHandle) -> Result<(), String> {
    let mut data_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    data_path.push("sessions");
    if data_path.exists() {
        std::fs::remove_dir_all(&data_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn open_isolated_webview(app: AppHandle, account_id: String, url: String, preload: Option<bool>) {
    let main_window = app.get_window("main").unwrap();
    let label = format!("account-{}", account_id);

    // Resolve unique data path
    let mut data_path = app.path().app_data_dir().unwrap();
    data_path.push(format!("sessions/account_{}", account_id));

    let is_preload = preload.unwrap_or(false);

    // If webview already exists, show and focus it if not preloading
    if let Some(webview) = app.get_webview(&label) {
        if !is_preload {
            let _ = webview.show();
            let _ = webview.set_focus();
        }
        return;
    }

    // Build the child webview (completely bare of JS shortcut listeners since they are moved to the frontend Dock)
    let webview_builder = WebviewBuilder::new(&label, WebviewUrl::External(url.parse().unwrap()))
        .data_directory(data_path);

    // Add it as a child of the main window
    let size = main_window.inner_size().unwrap();
    let scale_factor = main_window.scale_factor().unwrap_or(1.0);
    // Default to full window height minus a 70px logical bezel at the bottom
    let gap_size = (70.0 * scale_factor) as u32;
    let child_height = if size.height > gap_size { size.height - gap_size } else { size.height };

    let child = main_window.add_child(
        webview_builder,
        tauri::PhysicalPosition::new(0, 0),
        tauri::PhysicalSize::new(size.width, child_height),
    ).unwrap();

    let _ = child.hide();

    if !is_preload {
        // Spawn 300ms delayed show/focus task to eliminate the WebView2 initial double-blink white flash
        let child_clone = child.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            let _ = child_clone.show();
            let _ = child_clone.set_focus();
        });
    }
}

#[tauri::command]
async fn hide_isolated_webview(app: AppHandle, account_id: String) {
    let label = format!("account-{}", account_id);
    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.hide();
    }
}

#[tauri::command]
async fn close_isolated_webview(app: AppHandle, account_id: String) {
    let label = format!("account-{}", account_id);
    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.close();
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
async fn go_home_command(app: AppHandle, action: Option<String>) {
    let _ = app.emit("go-home", action);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            minimize_to_tray: AtomicBool::new(true),
        })
        .setup(|app| {
            // Build the tray menu
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Open Mail", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let icon = app.default_window_icon().cloned();
            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = icon {
                tray_builder = tray_builder.icon(icon);
            }
            let _tray = tray_builder.build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                if state.minimize_to_tray.load(Ordering::Relaxed) {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            set_minimize_to_tray,
            clear_account_cache,
            clear_all_cache,
            open_isolated_webview,
            hide_isolated_webview,
            close_isolated_webview,
            resize_isolated_webview,
            go_home_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
