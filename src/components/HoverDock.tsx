import { Account } from "../App";

interface HoverDockProps {
  accounts: Account[];
  activeAccountId: string;
  onSelectAccount: (id: string) => void;
  onGoHome: () => void;
}

export default function HoverDock({
  accounts,
  activeAccountId,
  onSelectAccount,
  onGoHome,
}: HoverDockProps) {
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

  return (
    <>
      {/* Edge Hover Trigger Zone (Invisible block at the bottom of viewport) */}
      <div className="fixed bottom-0 left-0 right-0 h-10 bg-transparent z-40 group/trigger">
        
        {/* Dock Wrapper: Moves up when user hovers trigger zone or dock itself */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 translate-y-16 opacity-0 hover:translate-y-0 hover:opacity-100 group-hover/trigger:translate-y-0 group-hover/trigger:opacity-100 transition-all duration-300 ease-out z-50">
          
          <div className="bg-obsidian-canvas/90 backdrop-blur-md border border-obsidian-border rounded-full px-4 py-2.5 shadow-2xl flex items-center gap-3">
            
            {/* Home Launcher Button */}
            <button
              onClick={onGoHome}
              title="Return to Launcher"
              className="p-2.5 rounded-full bg-obsidian border border-obsidian-border text-obsidian-text-muted hover:text-white hover:border-purple-500/40 hover:bg-purple-500/10 transition-all cursor-pointer focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-obsidian-border" />

            {/* Account Switcher List */}
            <div className="flex items-center gap-2">
              {accounts.map((account) => {
                const isActive = account.id === activeAccountId;
                return (
                  <button
                    key={account.id}
                    onClick={() => onSelectAccount(account.id)}
                    title={account.name}
                    className={`p-2.5 rounded-full bg-obsidian border transition-all cursor-pointer focus:outline-none flex items-center justify-center ${
                      isActive
                        ? "border-purple-500 text-purple-400 ring-2 ring-purple-500/20 scale-105"
                        : `border-obsidian-border ${getBrandColor(account.type)}`
                    }`}
                  >
                    {getBrandIcon(account.type)}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
