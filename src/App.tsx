import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import AmbientGrid from "./components/AmbientGrid";
import ImmersiveCanvas from "./components/ImmersiveCanvas";
import HoverDock from "./components/HoverDock";

export interface Account {
  id: string;
  name: string;
  type: "gmail" | "outlook" | "icloud";
  url: string;
}

function App() {
  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: "work-gmail",
      name: "Work Mail",
      type: "gmail",
      url: "https://mail.google.com",
    },
    {
      id: "personal-outlook",
      name: "Personal Outlook",
      type: "outlook",
      url: "https://outlook.live.com",
    },
    {
      id: "icloud-dev",
      name: "Developer Mail",
      type: "icloud",
      url: "https://www.icloud.com/mail",
    },
  ]);

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

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
    const unlistenPromise = listen("go-home", () => {
      handleReturnHome();
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [activeAccountId]);

  const handleSelectAccount = (id: string) => {
    setActiveAccountId(id);
  };

  const handleAddAccount = (name: string, type: "gmail" | "outlook" | "icloud", url: string) => {
    const newAccount: Account = {
      id: `acc-${Date.now()}`,
      name,
      type,
      url,
    };
    setAccounts((prev) => [...prev, newAccount]);
  };

  return (
    <div className="relative min-h-screen bg-obsidian text-white overflow-hidden select-none">
      {activeAccountId === null ? (
        <AmbientGrid
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onAddAccount={handleAddAccount}
        />
      ) : (
        <>
          <ImmersiveCanvas
            activeAccountId={activeAccountId}
            accounts={accounts}
          />
          <HoverDock
            accounts={accounts}
            activeAccountId={activeAccountId}
            onSelectAccount={handleSelectAccount}
            onGoHome={handleReturnHome}
          />
        </>
      )}
    </div>
  );
}

export default App;
