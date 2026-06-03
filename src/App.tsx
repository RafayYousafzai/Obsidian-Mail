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
  iconUrl?: string;
}

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: "work-gmail",
    name: "Work Mail",
    type: "gmail",
    url: "https://mail.google.com",
    iconUrl: "/logos/gmail.png",
  },
  {
    id: "personal-outlook",
    name: "Personal Outlook",
    type: "outlook",
    url: "https://outlook.live.com",
    iconUrl: "/logos/outlook.png",
  },
  {
    id: "icloud-dev",
    name: "Developer Mail",
    type: "icloud",
    url: "https://www.icloud.com/mail",
  },
];

function App() {
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

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("obsidian_accounts", JSON.stringify(accounts));
  }, [accounts]);

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

  const handleAddAccount = (
    name: string,
    type: "gmail" | "outlook" | "icloud",
    url: string,
    iconUrl?: string
  ) => {
    const newAccount: Account = {
      id: `acc-${Date.now()}`,
      name,
      type,
      url,
      iconUrl,
    };
    setAccounts((prev) => [...prev, newAccount]);
  };

  const handleEditAccount = (
    id: string,
    name: string,
    type: "gmail" | "outlook" | "icloud",
    url: string,
    iconUrl?: string
  ) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id ? { ...acc, name, type, url, iconUrl } : acc
      )
    );
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
    if (activeAccountId === id) {
      setActiveAccountId(null);
    }
  };

  const handleReorderAccounts = (id: string, direction: "left" | "right") => {
    setAccounts((prev) => {
      const index = prev.findIndex((acc) => acc.id === id);
      if (index === -1) return prev;

      const newAccounts = [...prev];
      if (direction === "left" && index > 0) {
        const temp = newAccounts[index];
        newAccounts[index] = newAccounts[index - 1];
        newAccounts[index - 1] = temp;
      } else if (direction === "right" && index < prev.length - 1) {
        const temp = newAccounts[index];
        newAccounts[index] = newAccounts[index + 1];
        newAccounts[index + 1] = temp;
      }
      return newAccounts;
    });
  };

  return (
    <div className={`relative h-screen bg-obsidian text-white select-none ${
      activeAccountId === null ? "overflow-y-auto" : "overflow-hidden"
    }`}>
      {activeAccountId === null ? (
        <AmbientGrid
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onAddAccount={handleAddAccount}
          onEditAccount={handleEditAccount}
          onDeleteAccount={handleDeleteAccount}
          onReorderAccounts={handleReorderAccounts}
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
