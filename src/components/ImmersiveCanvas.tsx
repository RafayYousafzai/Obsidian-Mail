import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Account } from "../App";

interface ImmersiveCanvasProps {
  activeAccountId: string;
  accounts: Account[];
}

const isLinux = typeof window !== "undefined" && navigator.userAgent.toLowerCase().includes("linux");

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
          preload: false,
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



  if (isLinux) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 h-[70px] bg-obsidian-canvas border-t border-obsidian-border pointer-events-none z-20" />
  );
}
