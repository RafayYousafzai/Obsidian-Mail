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

  return (
    <div className="absolute inset-x-0 bottom-0 h-[90px] bg-transparent flex flex-col justify-end items-center select-none text-center p-6 pointer-events-none">
      
      {/* Sleek bottom status only shown when NOT hovered */}
      {!isDockHovered && (
        <div className="space-y-1 animate-fade-in pointer-events-none mb-2 select-none">
          <div className="flex space-x-1.5 items-center justify-center">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
            </span>
            <span className="text-[8px] uppercase tracking-widest text-obsidian-text-muted/50 font-semibold">
              Connected
            </span>
          </div>
        </div>
      )}

      {/* Invisible trigger zone at the absolute bottom of main window (8px bezel) */}
      {!isDockHovered && (
        <div
          onMouseEnter={() => onSetDockHovered(true)}
          className="absolute bottom-0 left-0 right-0 h-2 bg-transparent pointer-events-auto cursor-ns-resize hover:bg-purple-500/10 transition-colors z-40"
        />
      )}
      
    </div>
  );
}
