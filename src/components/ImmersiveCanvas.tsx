import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Account } from "../App";

interface ImmersiveCanvasProps {
  activeAccountId: string;
  accounts: Account[];
  isDockHovered: boolean;
  onSetDockHovered: (hovered: boolean) => void;
}

export default function ImmersiveCanvas({
  activeAccountId,
  accounts,
  isDockHovered,
  onSetDockHovered,
}: ImmersiveCanvasProps) {
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

  // Handle window resizing and leaveGap config dynamically
  useEffect(() => {
    const handleResize = async () => {
      try {
        await invoke("resize_isolated_webview", {
          accountId: activeAccountId,
          width: window.innerWidth,
          height: window.innerHeight,
          leaveGap: isDockHovered,
        });
      } catch (err) {
        console.error("Error resizing webview:", err);
      }
    };

    window.addEventListener("resize", handleResize);
    // Initial size setting after a small timeout to let the webview mount
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [activeAccountId, isDockHovered]);

  // If dock is hovered, the status bar hides to let the HoverDock draw in the 90px space
  if (isDockHovered) {
    return null;
  }

  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  return (
    <div className="absolute inset-x-0 bottom-0 h-[32px] bg-obsidian-canvas border-t border-obsidian-border flex items-center justify-between px-6 select-none z-30">
      
      {/* Connected Status Info */}
      <div className="flex items-center space-x-2.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-200 font-extrabold">
          {activeAccount?.name || "Session"} Connected
        </span>
      </div>

      {/* Guide Hint */}
      <div className="text-[10px] text-obsidian-text-muted select-none flex items-center gap-1.5">
        Press <kbd className="bg-obsidian border border-obsidian-border px-1.5 py-0.5 rounded text-white text-[9px] shadow-sm font-semibold">Esc</kbd> or <kbd className="bg-obsidian border border-obsidian-border px-1.5 py-0.5 rounded text-white text-[9px] shadow-sm font-semibold">Ctrl + H</kbd> to return home
      </div>

      {/* Ergonomic Hover Trigger Zone: Full width/height of the status bar */}
      <div
        onMouseEnter={() => onSetDockHovered(true)}
        className="absolute inset-0 bg-transparent cursor-ns-resize hover:bg-purple-500/5 transition-colors z-40"
      />
      
    </div>
  );
}
