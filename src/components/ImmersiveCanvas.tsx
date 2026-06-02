import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Account } from "../App";

interface ImmersiveCanvasProps {
  activeAccountId: string;
  accounts: Account[];
}

export default function ImmersiveCanvas({ activeAccountId, accounts }: ImmersiveCanvasProps) {
  const previousAccountIdRef = useRef<string | null>(null);

  useEffect(() => {
    const activeAccount = accounts.find((acc) => acc.id === activeAccountId);
    if (!activeAccount) return;

    const handleWebviews = async () => {
      // 1. Open/Show the new active webview
      try {
        await invoke("open_isolated_webview", {
          accountId: activeAccount.id,
          url: activeAccount.url,
        });
      } catch (err) {
        console.error("Error opening webview:", err);
      }

      // 2. Hide the previous webview if there was one and it is different
      const prevId = previousAccountIdRef.current;
      if (prevId && prevId !== activeAccountId) {
        try {
          await invoke("hide_isolated_webview", { accountId: prevId });
        } catch (err) {
          console.error("Error hiding previous webview:", err);
        }
      }

      // 3. Update the ref to current active
      previousAccountIdRef.current = activeAccountId;
    };

    handleWebviews();

    // Cleanup: Hide when component unmounts (returning home)
    return () => {
      if (activeAccountId) {
        invoke("hide_isolated_webview", { accountId: activeAccountId }).catch((err) =>
          console.error("Error hiding webview on cleanup:", err)
        );
      }
    };
  }, [activeAccountId, accounts]);

  return (
    <div className="absolute inset-0 bg-obsidian flex flex-col justify-center items-center select-none text-center p-6">
      <div className="space-y-4 max-w-sm animate-fade-in">
        <div className="flex space-x-2 items-center justify-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          <span className="text-[10px] uppercase tracking-widest text-obsidian-text-muted font-bold">
            Session Connected
          </span>
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-wide">
          {accounts.find(a => a.id === activeAccountId)?.name || "Session"}
        </h2>
        <p className="text-xs text-obsidian-text-muted leading-relaxed">
          Isolated session webview has been mounted. Move your mouse cursor to the bottom edge of the screen to reveal the navigation dock, or press <kbd className="bg-obsidian-canvas border border-obsidian-border px-1.5 py-0.5 rounded text-white text-[10px] shadow-sm">Esc</kbd> to return home.
        </p>
      </div>
    </div>
  );
}
