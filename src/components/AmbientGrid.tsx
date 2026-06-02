import { useState, useEffect } from "react";
import { Account } from "../App";

interface AmbientGridProps {
  accounts: Account[];
  onSelectAccount: (id: string) => void;
  onAddAccount: (name: string, type: "gmail" | "outlook" | "icloud", url: string) => void;
}

export default function AmbientGrid({
  accounts,
  onSelectAccount,
  onAddAccount,
}: AmbientGridProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"gmail" | "outlook" | "icloud">("gmail");
  const [newUrl, setNewUrl] = useState("https://mail.google.com");

  // Automatically update default URL based on type
  useEffect(() => {
    if (newType === "gmail") setNewUrl("https://mail.google.com");
    else if (newType === "outlook") setNewUrl("https://outlook.live.com");
    else if (newType === "icloud") setNewUrl("https://www.icloud.com/mail");
  }, [newType]);

  // Keyboard shortcut listener for numbers (1, 2, 3...)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in inputs
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT") {
        return;
      }
      
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= accounts.length) {
        onSelectAccount(accounts[num - 1].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [accounts, onSelectAccount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;
    onAddAccount(newName, newType, newUrl);
    setNewName("");
    setShowAddModal(false);
  };

  // Helper to render platform SVGs
  const getIcon = (type: "gmail" | "outlook" | "icloud") => {
    switch (type) {
      case "gmail":
        return (
          <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        );
      case "outlook":
        return (
          <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.38-1.12-2.5-2.5-2.5s-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5zm-5 6.75C8.89 18.75 4 17.58 4 14.5V9.5c0-3.08 4.89-4.25 7.5-4.25s7.5 1.17 7.5 4.25v5c0 3.08-4.89 4.25-7.5 4.25z" />
          </svg>
        );
      case "icloud":
        return (
          <svg className="w-10 h-10 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
        );
    }
  };

  return (
    <main className="min-h-screen bg-obsidian flex flex-col justify-center items-center px-6 py-12 relative w-screen h-screen">
      
      {/* Title */}
      <div className="text-center space-y-3 mb-16 animate-fade-in">
        <h1 className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-white via-gray-300 to-obsidian-text-muted bg-clip-text text-transparent uppercase">
          Obsidian Launcher
        </h1>
        <p className="text-sm text-obsidian-text-muted tracking-widest uppercase">
          Select an account or use number shortcuts [1 - {accounts.length}]
        </p>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl w-full">
        {accounts.map((account, index) => (
          <button
            key={account.id}
            onClick={() => onSelectAccount(account.id)}
            className="group text-left relative bg-obsidian-canvas border border-obsidian-border hover:border-purple-500/30 rounded-2xl p-6 shadow-xl hover:shadow-purple-500/5 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-48 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            {/* Shortcut Badge */}
            <span className="absolute top-4 right-4 bg-obsidian border border-obsidian-border text-[10px] font-bold text-obsidian-text-muted px-2 py-0.5 rounded-md group-hover:border-purple-500/30 group-hover:text-purple-400 transition-colors">
              {index + 1}
            </span>

            {/* Platform Icon */}
            <div className="p-3 bg-obsidian rounded-xl border border-obsidian-border group-hover:border-purple-500/20 transition-colors w-fit">
              {getIcon(account.type)}
            </div>

            {/* Account Info */}
            <div>
              <h2 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                {account.name}
              </h2>
              <p className="text-xs text-obsidian-text-muted truncate mt-1">
                {account.url}
              </p>
            </div>
          </button>
        ))}

        {/* Add Account Card */}
        <button
          onClick={() => setShowAddModal(true)}
          className="group relative bg-obsidian-canvas border-2 border-dashed border-obsidian-border hover:border-purple-500/40 rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center h-48 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
        >
          <div className="p-3 bg-obsidian rounded-full border border-obsidian-border group-hover:border-purple-500/20 transition-colors mb-3">
            <svg className="w-6 h-6 text-obsidian-text-muted group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <span className="text-sm font-bold text-obsidian-text-muted group-hover:text-purple-400 transition-colors">
            Add Account
          </span>
        </button>
      </div>

      {/* Add Account Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-obsidian-canvas border border-obsidian-border rounded-2xl p-8 shadow-2xl flex flex-col space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Add Isolated Account</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-obsidian-text-muted hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g., Personal Outlook"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-obsidian border border-obsidian-border focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-obsidian-text-muted outline-none transition-colors"
                  required
                />
              </div>

              {/* Service Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted">Service Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-obsidian border border-obsidian-border focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                >
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook</option>
                  <option value="icloud">iCloud Mail</option>
                </select>
              </div>

              {/* URL */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted">Service URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-obsidian border border-obsidian-border focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-obsidian-text-muted outline-none transition-colors"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all cursor-pointer active:scale-98"
              >
                Create Isolated Instance
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
