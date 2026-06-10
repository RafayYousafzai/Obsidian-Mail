use std::sync::atomic::{AtomicBool, Ordering};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl};
use tauri::webview::WebviewBuilder;

#[cfg(target_os = "linux")]
fn update_linux_layout(window: &tauri::Window, active_account_id: Option<&str>) {
    use gtk::prelude::*;
    if let Ok(gtk_window) = window.gtk_window() {
        if let Some(container) = gtk_window.child() {
            if let Some(gtk_box) = container.downcast_ref::<gtk::Box>() {
                let children = gtk_box.children();
                
                // Print all children details to stdout for debugging
                println!("--- update_linux_layout active={:?} ---", active_account_id);
                for (i, child) in children.iter().enumerate() {
                    println!("  Child {}: name={:?}, type={:?}, visible={:?}, size_req={:?}, size_alloc={:?}",
                        i, child.widget_name(), child.type_().name(), child.is_visible(), child.size_request(), child.allocation());
                }

                let mut main_webview_widget: Option<gtk::Widget> = None;
                let mut active_child_widget: Option<gtk::Widget> = None;
                
                let active_name = active_account_id.map(|id| format!("account-{}", id));
                
                for child in &children {
                    let name = child.widget_name();
                    if name.as_str() == "main-webview" {
                        main_webview_widget = Some(child.clone());
                    } else if let Some(ref act_name) = active_name {
                        if name.as_str() == act_name {
                            active_child_widget = Some(child.clone());
                        }
                    }
                }
                
                if let Some(main_widget) = main_webview_widget {
                    if let Some(active_widget) = active_child_widget {
                        // 1. Hide the main webview (React UI / launcher)
                        main_widget.set_visible(false);
                        
                        // 2. Configure active child webview to expand and fill
                        active_widget.set_hexpand(true);
                        active_widget.set_vexpand(true);
                        active_widget.set_halign(gtk::Align::Fill);
                        active_widget.set_valign(gtk::Align::Fill);
                        active_widget.set_size_request(-1, 0);
                        gtk_box.set_child_packing(&active_widget, true, true, 0, gtk::PackType::Start);
                        
                        // 3. Make sure only the active child is visible, hide all other account webviews
                        for child in &children {
                            let name = child.widget_name();
                            if name.as_str() != "main-webview" {
                                if Some(name.as_str()) == active_name.as_deref() {
                                    child.set_visible(true);
                                } else {
                                    child.set_visible(false);
                                }
                            }
                        }
                        
                        // 4. Reorder: active child webview at index 0
                        gtk_box.reorder_child(&active_widget, 0);
                    } else {
                        // Home screen: only main webview should fill and be visible
                        main_widget.set_hexpand(true);
                        main_widget.set_vexpand(true);
                        main_widget.set_halign(gtk::Align::Fill);
                        main_widget.set_valign(gtk::Align::Fill);
                        main_widget.set_size_request(-1, -1);
                        gtk_box.set_child_packing(&main_widget, true, true, 0, gtk::PackType::Start);
                        
                        main_widget.set_visible(true);
                        
                        // Hide all child webviews
                        for child in &children {
                            let name = child.widget_name();
                            if name.as_str() != "main-webview" {
                                child.set_visible(false);
                            }
                        }
                        
                        gtk_box.reorder_child(&main_widget, 0);
                    }
                }
            }
        }
    }
}

#[cfg(not(target_os = "linux"))]
fn update_linux_layout(_window: &tauri::Window, _active_account_id: Option<&str>) {}

use std::sync::Mutex;

struct AppState {
    minimize_to_tray: AtomicBool,
    active_account_id: Mutex<Option<String>>,
}

#[derive(serde::Deserialize)]
struct HeaderBarAccount {
    id: String,
    name: String,
    active: bool,
}

#[tauri::command]
async fn sync_accounts_to_headerbar(app: AppHandle, accounts: Vec<HeaderBarAccount>) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        use gtk::prelude::*;
        let main_window = app.get_window("main").ok_or("Main window not found")?;
        
        let (tx, rx) = tokio::sync::oneshot::channel();
        let mut tx_opt = Some(tx);
        let mut accounts_opt = Some(accounts);
        gtk::glib::idle_add_local(move || {
            let res = (|| {
                if let Some(accounts) = accounts_opt.take() {
                    if let Ok(gtk_window) = main_window.gtk_window() {
                        if let Some(titlebar) = gtk_window.titlebar() {
                            if let Some(headerbar) = titlebar.downcast_ref::<gtk::HeaderBar>() {
                                let mut accounts_box_opt = None;
                                for child in headerbar.children() {
                                    if child.widget_name().as_str() == "headerbar-accounts-box" {
                                        if let Some(bbox) = child.downcast_ref::<gtk::Box>() {
                                            accounts_box_opt = Some(bbox.clone());
                                            break;
                                        }
                                    }
                                }
                                
                                if let Some(accounts_box) = accounts_box_opt {
                                    // Clear existing children
                                    for child in accounts_box.children() {
                                        accounts_box.remove(&child);
                                    }
                                    
                                    // Add buttons for each account
                                    for acc in accounts {
                                        let button = gtk::Button::with_label(&acc.name);
                                        if acc.active {
                                            button.style_context().add_class("suggested-action");
                                        }
                                        
                                        let app_handle = app.clone();
                                        let acc_id = acc.id.clone();
                                        button.connect_clicked(move |_| {
                                            let _ = app_handle.emit("select-account", acc_id.clone());
                                        });
                                        
                                        accounts_box.pack_start(&button, false, false, 0);
                                    }
                                    accounts_box.show_all();
                                }
                            }
                        }
                    }
                }
                Ok::<(), String>(())
            })();
            if let Some(tx) = tx_opt.take() {
                let _ = tx.send(res);
            }
            gtk::glib::ControlFlow::Break
        });
        
        rx.await.map_err(|e| e.to_string())??
    }
    
    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        let _ = accounts;
    }
    
    Ok(())
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
            // Set size right before showing to make sure it matches current layout
            let size = main_window.inner_size().unwrap();
            let scale_factor = main_window.scale_factor().unwrap_or(1.0);
            let gap_size = if cfg!(target_os = "linux") {
                0
            } else {
                (70.0 * scale_factor) as u32
            };
            let child_height = if size.height > gap_size { size.height - gap_size } else { size.height };
            let _ = webview.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(size.width, child_height)));

            let state = app.state::<AppState>();
            if let Ok(mut active_id) = state.active_account_id.lock() {
                *active_id = Some(account_id.clone());
            }

            #[cfg(target_os = "linux")]
            update_linux_layout(&main_window, Some(&account_id));

            let _ = webview.show();
            let _ = webview.set_focus();
        }
        return;
    }

    // Build the child webview (completely bare of JS shortcut listeners since they are moved to the frontend Dock)
    let webview_builder = WebviewBuilder::new(&label, WebviewUrl::External(url.parse().unwrap()))
        .data_directory(data_path)
        .auto_resize();

    // Add it as a child of the main window
    let size = main_window.inner_size().unwrap();
    let scale_factor = main_window.scale_factor().unwrap_or(1.0);
    // Default to full window height minus a 70px logical bezel at the bottom
    let gap_size = if cfg!(target_os = "linux") {
        0
    } else {
        (70.0 * scale_factor) as u32
    };
    let child_height = if size.height > gap_size { size.height - gap_size } else { size.height };

    let child = match main_window.add_child(
        webview_builder,
        tauri::PhysicalPosition::new(0, 0),
        tauri::PhysicalSize::new(size.width, child_height),
    ) {
        Ok(c) => c,
        Err(e) => {
            if let Some(w) = app.get_webview(&label) {
                w
            } else {
                panic!("failed to add child webview: {:?}", e);
            }
        }
    };

    #[cfg(target_os = "linux")]
    {
        use gtk::prelude::*;
        if let Ok(gtk_window) = main_window.gtk_window() {
            if let Some(container) = gtk_window.child() {
                if let Some(gtk_box) = container.downcast_ref::<gtk::Box>() {
                    if let Some(new_child) = gtk_box.children().last() {
                        new_child.set_widget_name(&format!("account-{}", account_id));
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    update_linux_layout(&main_window, None);

    let _ = child.hide();

    if !is_preload {
        // Spawn 300ms delayed show/focus task to eliminate the WebView2 initial double-blink white flash
        let child_clone = child.clone();
        let main_window_clone = main_window.clone();
        let app_clone = app.clone();
        let account_id_clone = account_id.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            
            // Set size right before showing to enforce GtkBox allocation on Linux and layout refresh
            let size = main_window_clone.inner_size().unwrap();
            let scale_factor = main_window_clone.scale_factor().unwrap_or(1.0);
            let gap_size = if cfg!(target_os = "linux") {
                0
            } else {
                (70.0 * scale_factor) as u32
            };
            let child_height = if size.height > gap_size { size.height - gap_size } else { size.height };
            let _ = child_clone.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(size.width, child_height)));

            let state = app_clone.state::<AppState>();
            if let Ok(mut active_id) = state.active_account_id.lock() {
                *active_id = Some(account_id_clone.clone());
            }

            #[cfg(target_os = "linux")]
            update_linux_layout(&main_window_clone, Some(&account_id_clone));

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

        let state = app.state::<AppState>();
        if let Ok(mut active_id) = state.active_account_id.lock() {
            if Some(account_id.clone()) == *active_id {
                *active_id = None;
            }
        }

        if let Some(main_window) = app.get_window("main") {
            #[cfg(target_os = "linux")]
            update_linux_layout(&main_window, None);

            let _ = main_window.set_focus();
        }
    }
}

#[tauri::command]
async fn close_isolated_webview(app: AppHandle, account_id: String) {
    let label = format!("account-{}", account_id);
    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.close();

        let state = app.state::<AppState>();
        if let Ok(mut active_id) = state.active_account_id.lock() {
            if Some(account_id.clone()) == *active_id {
                *active_id = None;
            }
        }

        if let Some(main_window) = app.get_window("main") {
            #[cfg(target_os = "linux")]
            update_linux_layout(&main_window, None);
        }
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
        
        let physical_gap = if cfg!(target_os = "linux") {
            0
        } else {
            (70.0 * scale_factor) as u32
        };
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
            active_account_id: Mutex::new(None),
        })
        .setup(|app| {
            #[cfg(target_os = "linux")]
            {
                use gtk::prelude::*;
                let window = app.get_window("main").unwrap();
                if let Ok(gtk_window) = window.gtk_window() {
                    // Create GTK HeaderBar
                    let header_bar = gtk::HeaderBar::new();
                    header_bar.set_show_close_button(true);
                    // Create custom title label wrapped in EventBox
                    let event_box = gtk::EventBox::new();
                    event_box.set_visible_window(false);
                    let title_label = gtk::Label::new(Some("Obsidian Mail"));
                    title_label.style_context().add_class("title");
                    event_box.add(&title_label);
                    header_bar.set_custom_title(Some(&event_box));

                    let gtk_window_clone_eb = gtk_window.clone();
                    event_box.connect_button_press_event(move |_, event| {
                        println!("[Title EventBox] Mouse button press event: button={}", event.button());
                        if event.button() == 1 {
                            if let Some((root_x, root_y)) = event.root_coords() {
                                println!("[Title EventBox] Initiating native drag-and-move at ({}, {})", root_x, root_y);
                                gtk_window_clone_eb.begin_move_drag(
                                    event.button() as i32,
                                    root_x as i32,
                                    root_y as i32,
                                    event.time(),
                                );
                                return gtk::glib::Propagation::Stop;
                            }
                        }
                        gtk::glib::Propagation::Proceed
                    });

                    // Create Home Button
                    let home_button = gtk::Button::new();
                    let home_image = gtk::Image::from_icon_name(Some("go-home"), gtk::IconSize::Button);
                    home_button.set_image(Some(&home_image));
                    home_button.set_always_show_image(true);
                    home_button.set_tooltip_text(Some("Home"));

                    let app_handle = app.handle().clone();
                    home_button.connect_clicked(move |_| {
                        let _ = app_handle.emit("go-home", None::<String>);
                    });
                    header_bar.pack_start(&home_button);

                    // Create a container for account shortcuts
                    let accounts_box = gtk::Box::new(gtk::Orientation::Horizontal, 6);
                    accounts_box.set_widget_name("headerbar-accounts-box");
                    header_bar.pack_start(&accounts_box);

                    gtk_window.set_titlebar(Some(&header_bar));
                    header_bar.show_all();

                    let gtk_window_clone = gtk_window.clone();
                    header_bar.connect_button_press_event(move |_, event| {
                        println!("[HeaderBar] Mouse button press event: button={}", event.button());
                        if event.button() == 1 {
                            if let Some((root_x, root_y)) = event.root_coords() {
                                println!("[HeaderBar] Initiating native drag-and-move at ({}, {})", root_x, root_y);
                                gtk_window_clone.begin_move_drag(
                                    event.button() as i32,
                                    root_x as i32,
                                    root_y as i32,
                                    event.time(),
                                );
                                return gtk::glib::Propagation::Stop;
                            }
                        }
                        gtk::glib::Propagation::Proceed
                    });

                    if let Some(container) = gtk_window.child() {
                        if let Some(gtk_box) = container.downcast_ref::<gtk::Box>() {
                            if let Some(main_webview) = gtk_box.children().first() {
                                main_webview.set_widget_name("main-webview");
                            }
                        }
                    }
                }
            }

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
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    let state = window.state::<AppState>();
                    if state.minimize_to_tray.load(Ordering::Relaxed) {
                        let _ = window.hide();
                        api.prevent_close();
                    }
                }
                tauri::WindowEvent::Resized(_physical_size) => {
                    if window.label() == "main" {
                        #[cfg(not(target_os = "linux"))]
                        {
                            let state = window.state::<AppState>();
                            let active_id_opt = state.active_account_id.lock().ok().and_then(|guard| guard.clone());
                            if let Some(active_id) = active_id_opt {
                                let label = format!("account-{}", active_id);
                                if let Some(webview) = window.app_handle().get_webview(&label) {
                                    let scale_factor = window.scale_factor().unwrap_or(1.0);
                                    let physical_gap = (70.0 * scale_factor) as u32;
                                    let child_height = if _physical_size.height > physical_gap {
                                        _physical_size.height - physical_gap
                                    } else {
                                        _physical_size.height
                                    };

                                    let new_size = tauri::Size::Physical(tauri::PhysicalSize::new(_physical_size.width, child_height));
                                    let _ = webview.set_size(new_size);
                                }
                            }
                        }

                        #[cfg(target_os = "linux")]
                        {
                            let state = window.state::<AppState>();
                            let active_id_opt = state.active_account_id.lock().ok().and_then(|guard| guard.clone());
                            update_linux_layout(window, active_id_opt.as_deref());
                        }
                    }
                }
                _ => {}
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
            go_home_command,
            sync_accounts_to_headerbar
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
