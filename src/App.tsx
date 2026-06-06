import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import AmbientGrid from "./components/AmbientGrid";
import ImmersiveCanvas from "./components/ImmersiveCanvas";
import HoverDock from "./components/HoverDock";

export interface Account {
  id: string;
  name: string;
  type: "gmail" | "outlook" | "icloud";
  url: string;
  iconUrl?: string;
  profileId: string;
  group: string;
  isPinned: boolean;
  lastAccessed: number;
}

export interface Profile {
  id: string;
  name: string;
}

const DEFAULT_PROFILES: Profile[] = [
  { id: "work", name: "Work" },
  { id: "personal", name: "Personal" },
];

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: "work-gmail",
    name: "Work Mail",
    type: "gmail",
    url: "https://mail.google.com",
    iconUrl: "/logos/gmail.png",
    profileId: "work",
    group: "Business",
    isPinned: true,
    lastAccessed: Date.now(),
  },
  {
    id: "personal-outlook",
    name: "Personal Outlook",
    type: "outlook",
    url: "https://outlook.live.com",
    iconUrl: "/logos/outlook.png",
    profileId: "personal",
    group: "Personal",
    isPinned: true,
    lastAccessed: Date.now(),
  },
  {
    id: "icloud-dev",
    name: "Developer Mail",
    type: "icloud",
    url: "https://www.icloud.com/mail",
    profileId: "work",
    group: "Business",
    isPinned: false,
    lastAccessed: Date.now(),
  },
];

function App() {
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem("obsidian_profiles");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse profiles:", err);
      }
    }
    return DEFAULT_PROFILES;
  });

  const [currentProfileId, setCurrentProfileId] = useState<string>(() => {
    const saved = localStorage.getItem("obsidian_current_profile_id");
    return saved || "work";
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem("obsidian_accounts");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse saved accounts:", err);
      }
    }
    return DEFAULT_ACCOUNTS;
  });

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("obsidian_theme");
    return (saved as any) || "dark";
  });

  const [minimizeToTray, setMinimizeToTray] = useState<boolean>(() => {
    const saved = localStorage.getItem("obsidian_minimize_to_tray");
    return saved !== "false";
  });

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [runningAccountIds, setRunningAccountIds] = useState<string[]>([]);
  const [autoOpenSearch, setAutoOpenSearch] = useState(false);

  // Custom Toast/Notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Custom Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };


  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("obsidian_profiles", JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem("obsidian_current_profile_id", currentProfileId);
  }, [currentProfileId]);

  useEffect(() => {
    localStorage.setItem("obsidian_accounts", JSON.stringify(accounts));
  }, [accounts]);

  // Sync theme class
  useEffect(() => {
    localStorage.setItem("obsidian_theme", theme);
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [theme]);

  // Sync minimize to tray command
  useEffect(() => {
    localStorage.setItem("obsidian_minimize_to_tray", String(minimizeToTray));
    invoke("set_minimize_to_tray", { enabled: minimizeToTray }).catch((err) =>
      console.error("Failed to sync minimize_to_tray setting:", err)
    );
  }, [minimizeToTray]);

  // Hidden-Until-Ready loading strategy to prevent rendering flashes/blinks
  useEffect(() => {
    // Allow light/dark canvas painting tasks to complete inside macro-task queue
    const timer = setTimeout(async () => {
      try {
        const currentWin = getCurrentWindow();
        await currentWin.show();
        await currentWin.setFocus();
      } catch (err) {
        console.error("Failed to show or focus window:", err);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [currentProfileId, theme]);

  // Return home logic
  const handleReturnHome = async () => {
    if (activeAccountId) {
      try {
        await invoke("hide_isolated_webview", { accountId: activeAccountId });
      } catch (err) {
        console.error("Failed to hide webview:", err);
      }
    }
    setActiveAccountId(null);
  };

  // Keyboard shortcut listener to go home (Escape or Ctrl + H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.ctrlKey && e.key.toLowerCase() === "h")) {
        e.preventDefault();
        handleReturnHome();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Listen to native tauri event injected in webview
    const unlistenPromise = listen<string | null>("go-home", (event) => {
      handleReturnHome();
      if (event.payload === "search") {
        setAutoOpenSearch(true);
      }
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [activeAccountId]);

  // Select account handles access recency
  const handleSelectAccount = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id ? { ...acc, lastAccessed: Date.now() } : acc
      )
    );
    setActiveAccountId(id);
    setRunningAccountIds((prev) => prev.includes(id) ? prev : [...prev, id]);
  };

  const handleAddAccount = (
    name: string,
    type: "gmail" | "outlook" | "icloud",
    url: string,
    iconUrl?: string,
    group?: string
  ) => {
    const newAccount: Account = {
      id: `acc-${Date.now()}`,
      name,
      type,
      url,
      iconUrl,
      profileId: currentProfileId,
      group: group || "",
      isPinned: false,
      lastAccessed: Date.now(),
    };
    setAccounts((prev) => [...prev, newAccount]);
  };

  const handleEditAccount = (
    id: string,
    name: string,
    type: "gmail" | "outlook" | "icloud",
    url: string,
    iconUrl?: string,
    group?: string,
    isPinned?: boolean
  ) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id
          ? {
              ...acc,
              name,
              type,
              url,
              iconUrl,
              group: group || "",
              isPinned: isPinned ?? acc.isPinned,
            }
          : acc
      )
    );
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
    if (activeAccountId === id) {
      setActiveAccountId(null);
    }
    invoke("close_isolated_webview", { accountId: id }).catch((err) =>
      console.error("Failed to destroy webview on delete:", err)
    );
  };

  const handleReorderAccounts = (id: string, direction: "left" | "right") => {
    // Reorder only within the active profile's accounts
    setAccounts((prev) => {
      const activeIndices = prev
        .map((acc, idx) => (acc.profileId === currentProfileId ? idx : -1))
        .filter((idx) => idx !== -1);

      const itemIdx = prev.findIndex((acc) => acc.id === id);
      if (itemIdx === -1) return prev;

      const positionInActive = activeIndices.indexOf(itemIdx);
      if (positionInActive === -1) return prev;

      const newAccounts = [...prev];
      if (direction === "left" && positionInActive > 0) {
        const swapTargetIdx = activeIndices[positionInActive - 1];
        const temp = newAccounts[itemIdx];
        newAccounts[itemIdx] = newAccounts[swapTargetIdx];
        newAccounts[swapTargetIdx] = temp;
      } else if (direction === "right" && positionInActive < activeIndices.length - 1) {
        const swapTargetIdx = activeIndices[positionInActive + 1];
        const temp = newAccounts[itemIdx];
        newAccounts[itemIdx] = newAccounts[swapTargetIdx];
        newAccounts[swapTargetIdx] = temp;
      }
      return newAccounts;
    });
  };

  const handleTogglePinAccount = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id ? { ...acc, isPinned: !acc.isPinned } : acc
      )
    );
  };

  // Launch workspace warms up (pre-loads) all accounts in background
  const handleLaunchWorkspace = async () => {
    const activeAccounts = accounts.filter((acc) => acc.profileId === currentProfileId);
    if (activeAccounts.length === 0) return;

    const newlyRunning: string[] = [];
    for (const acc of activeAccounts) {
      try {
        await invoke("open_isolated_webview", {
          accountId: acc.id,
          url: acc.url,
          preload: true,
        });
        newlyRunning.push(acc.id);
      } catch (err) {
        console.error("Failed to preload webview session:", acc.name, err);
      }
    }
    
    setRunningAccountIds((prev) => {
      const copy = [...prev];
      for (const id of newlyRunning) {
        if (!copy.includes(id)) copy.push(id);
      }
      return copy;
    });

    // Open/Select the first account immediately
    handleSelectAccount(activeAccounts[0].id);
    showToast(`Launched workspace: preloaded all ${activeAccounts.length} accounts!`, "success");
  };

  const handleCloseAccount = async (id: string) => {
    try {
      if (activeAccountId === id) {
        await handleReturnHome();
      }
      await invoke("close_isolated_webview", { accountId: id });
      setRunningAccountIds((prev) => prev.filter((runningId) => runningId !== id));
      showToast("Mailbox instance closed and memory freed.", "success");
    } catch (err) {
      console.error("Failed to close isolated webview:", err);
      showToast("Failed to close instance: " + err, "error");
    }
  };

  // Profile management handlers
  const handleAddProfile = (name: string) => {
    const newProfile = {
      id: `profile-${Date.now()}`,
      name,
    };
    setProfiles((prev) => [...prev, newProfile]);
    setCurrentProfileId(newProfile.id);
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) {
      showToast("You must keep at least one profile!", "error");
      return;
    }
    const filtered = profiles.filter((p) => p.id !== id);
    setProfiles(filtered);
    setAccounts((prev) => prev.filter((acc) => acc.profileId !== id));
    if (currentProfileId === id) {
      setCurrentProfileId(filtered[0].id);
    }
  };

  const handleRenameProfile = (id: string, newName: string) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
  };

  const handleClearCache = async (accountId: string) => {
    try {
      // Unmount first if active
      if (activeAccountId === accountId) {
        await handleReturnHome();
      }
      
      // Close the webview to release file locks on Windows
      await invoke("close_isolated_webview", { accountId });
      setRunningAccountIds((prev) => prev.filter((runningId) => runningId !== accountId));

      await invoke("clear_account_cache", { accountId });
      showToast("Cache cleared successfully for this account.", "success");
    } catch (err) {
      console.error("Failed to clear cache:", err);
      showToast("Error clearing cache: " + err, "error");
    }
  };

  const handleClearAllCache = async () => {
    try {
      await handleReturnHome();
      await invoke("clear_all_cache");
      showToast("All application cache directories have been cleared.", "success");
    } catch (err) {
      console.error("Failed to clear all cache:", err);
      showToast("Error clearing all caches: " + err, "error");
    }
  };

  // Filter accounts belonging only to the active profile
  const activeAccounts = accounts.filter((acc) => acc.profileId === currentProfileId);

  return (
    <div
      className={`relative h-screen bg-obsidian text-white select-none transition-colors duration-300 ${
        activeAccountId === null ? "overflow-y-auto" : "overflow-hidden"
      }`}
    >
      {activeAccountId === null ? (
        <AmbientGrid
          accounts={activeAccounts}
          allAccounts={accounts}
          profiles={profiles}
          currentProfileId={currentProfileId}
          theme={theme}
          minimizeToTray={minimizeToTray}
          onSelectAccount={handleSelectAccount}
          onAddAccount={handleAddAccount}
          onEditAccount={handleEditAccount}
          onDeleteAccount={handleDeleteAccount}
          onReorderAccounts={handleReorderAccounts}
          onTogglePinAccount={handleTogglePinAccount}
          onAddProfile={handleAddProfile}
          onDeleteProfile={handleDeleteProfile}
          onRenameProfile={handleRenameProfile}
          onSelectProfile={setCurrentProfileId}
          onSetTheme={setTheme}
          onSetMinimizeToTray={setMinimizeToTray}
          onClearCache={handleClearCache}
          onClearAllCache={handleClearAllCache}
          onLaunchWorkspace={handleLaunchWorkspace}
          autoOpenSearch={autoOpenSearch}
          onResetSearch={() => setAutoOpenSearch(false)}
          showConfirm={showConfirm}
          runningAccountIds={runningAccountIds}
          onCloseAccount={handleCloseAccount}
        />
      ) : (
        <>
          <ImmersiveCanvas
            activeAccountId={activeAccountId}
            accounts={accounts}
          />
          <HoverDock
            accounts={activeAccounts}
            activeAccountId={activeAccountId}
            onSelectAccount={handleSelectAccount}
            onGoHome={handleReturnHome}
            onSearchClick={() => {
              handleReturnHome();
              setAutoOpenSearch(true);
            }}
          />
        </>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 bg-obsidian-canvas/95 border border-obsidian-border rounded-xl shadow-2xl animate-fade-in pointer-events-auto max-w-sm">
          <div className="flex-shrink-0">
            {toast.type === "success" && (
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === "error" && (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.type === "info" && (
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <p className="text-xs font-semibold text-white leading-normal pr-4">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-obsidian-text-muted hover:text-white cursor-pointer ml-auto text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Custom Confirm Dialog Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in animate-scale-up">
          <div className="w-full max-w-sm bg-obsidian-canvas border border-obsidian-border rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-obsidian-text-muted leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="w-1/2 py-2 px-4 border border-obsidian-border/40 text-obsidian-text-muted hover:text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-obsidian/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="w-1/2 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg shadow-purple-600/25 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
