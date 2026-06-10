import { useState } from "react";
import { Account } from "../App";

interface HoverDockProps {
  accounts: Account[];
  activeAccountId: string;
  onSelectAccount: (id: string) => void;
  onGoHome: () => void;
  onSearchClick?: () => void;
}

export default function HoverDock({
  accounts,
  activeAccountId,
  onSelectAccount,
  onGoHome,
  onSearchClick,
}: HoverDockProps) {
  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});

  // Helper to render platform colors
  const getBrandColor = (type: "gmail" | "outlook" | "icloud") => {
    switch (type) {
      case "gmail":
        return "text-red-500 hover:bg-red-500/10 hover:border-red-500/30";
      case "outlook":
        return "text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/30";
      case "icloud":
        return "text-sky-400 hover:bg-sky-400/10 hover:border-sky-400/30";
    }
  };

  const getBrandIcon = (type: "gmail" | "outlook" | "icloud") => {
    switch (type) {
      case "gmail":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        );
      case "outlook":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.38-1.12-2.5-2.5-2.5s-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5zm-5 6.75C8.89 18.75 4 17.58 4 14.5V9.5c0-3.08 4.89-4.25 7.5-4.25s7.5 1.17 7.5 4.25v5c0 3.08-4.89 4.25-7.5 4.25z" />
          </svg>
        );
      case "icloud":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
        );
    }
  };

  const renderIcon = (account: Account) => {
    if (account.iconUrl && !iconErrors[account.id]) {
      return (
        <img
          src={account.iconUrl}
          alt={account.name}
          className="w-5 h-5 object-contain rounded-md"
          onError={() => {
            setIconErrors((prev) => ({ ...prev, [account.id]: true }));
          }}
        />
      );
    }
    return getBrandIcon(account.type);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[70px] flex items-center justify-center z-30 select-none animate-slide-up-fade">
      <div className="flex items-center gap-3">
        
        {/* Home Launcher Button */}
        <button
          onClick={onGoHome}
          title="Return to Launcher"
          className="p-2.5 rounded-full bg-obsidian border border-obsidian-border/40 text-obsidian-text-muted hover:text-obsidian-text-primary hover:border-blue-500/40 hover:bg-blue-500/10 transition-all cursor-pointer focus:outline-none flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </button>

        {/* Dock Search Button */}
        <button
          onClick={onSearchClick}
          title="Quick Search (Ctrl+K)"
          className="p-2.5 rounded-full bg-obsidian border border-obsidian-border/40 text-obsidian-text-muted hover:text-obsidian-text-primary hover:border-blue-500/40 hover:bg-blue-500/10 transition-all cursor-pointer focus:outline-none flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-obsidian-border/40" />

        {/* Account Switcher List */}
        <div className="flex items-center gap-3">
          {accounts.map((account) => {
            const isActive = account.id === activeAccountId;
            return (
              <div key={account.id} className="relative flex flex-col items-center group/dock-item">
                <button
                  onClick={() => onSelectAccount(account.id)}
                  title={account.name}
                  className={`p-2.5 rounded-full bg-obsidian border transition-all duration-300 cursor-pointer focus:outline-none flex items-center justify-center ${
                    isActive
                      ? "border-blue-500/20 text-blue-400 scale-105"
                      : `border-obsidian-border/40 ${getBrandColor(account.type)}`
                  }`}
                >
                  {renderIcon(account)}
                </button>
                {isActive && (
                  <span className="absolute -bottom-1.5 w-6 h-[3px] bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
