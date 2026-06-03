import { useState, useEffect } from "react";
import { Account } from "../App";

interface AmbientGridProps {
  accounts: Account[];
  onSelectAccount: (id: string) => void;
  onAddAccount: (name: string, type: "gmail" | "outlook" | "icloud", url: string, iconUrl?: string) => void;
  onEditAccount: (id: string, name: string, type: "gmail" | "outlook" | "icloud", url: string, iconUrl?: string) => void;
  onDeleteAccount: (id: string) => void;
  onReorderAccounts: (id: string, direction: "left" | "right") => void;
}

export default function AmbientGrid({
  accounts,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onReorderAccounts,
}: AmbientGridProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"gmail" | "outlook" | "icloud">("gmail");
  const [newUrl, setNewUrl] = useState("https://mail.google.com");
  const [newIconUrl, setNewIconUrl] = useState<string | undefined>(undefined);

  // Edit Modal State
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"gmail" | "outlook" | "icloud">("gmail");
  const [editUrl, setEditUrl] = useState("");
  const [editIconUrl, setEditIconUrl] = useState<string | undefined>(undefined);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    account: Account;
  } | null>(null);

  // Track image load errors to fallback to default SVG
  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});

  // Populate edit fields when editing state changes
  useEffect(() => {
    if (editingAccount) {
      setEditName(editingAccount.name);
      setEditType(editingAccount.type);
      setEditUrl(editingAccount.url);
      setEditIconUrl(editingAccount.iconUrl);
    }
  }, [editingAccount]);

  // Handle outside click to close context menu
  useEffect(() => {
    const closeMenu = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener("click", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
    };
  }, [contextMenu]);

  // Automatically update default URL based on type in Add Modal
  useEffect(() => {
    if (newType === "gmail") setNewUrl("https://mail.google.com");
    else if (newType === "outlook") setNewUrl("https://outlook.live.com");
    else if (newType === "icloud") setNewUrl("https://www.icloud.com/mail");
  }, [newType]);

  // Keyboard shortcut listener for numbers (1, 2, 3...)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const handleContextMenu = (e: React.MouseEvent, account: Account) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling up to window click listener
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      account,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        if (isEdit) {
          setEditIconUrl(resultStr);
        } else {
          setNewIconUrl(resultStr);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;
    
    let finalIconUrl = newIconUrl;
    if (!finalIconUrl) {
      if (newType === "gmail") finalIconUrl = "/logos/gmail.png";
      else if (newType === "outlook") finalIconUrl = "/logos/outlook.png";
      else if (newType === "icloud") finalIconUrl = "/logos/icloud.png";
    }
    
    onAddAccount(newName, newType, newUrl, finalIconUrl);
    setNewName("");
    setNewIconUrl(undefined);
    setShowAddModal(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editName.trim() || !editUrl.trim()) return;
    
    let finalIconUrl = editIconUrl;
    if (!finalIconUrl) {
      if (editType === "gmail") finalIconUrl = "/logos/gmail.png";
      else if (editType === "outlook") finalIconUrl = "/logos/outlook.png";
      else if (editType === "icloud") finalIconUrl = "/logos/icloud.png";
    }
    
    onEditAccount(editingAccount.id, editName, editType, editUrl, finalIconUrl);
    // Reset icon error state in case it loaded correctly now
    if (editingAccount.id in iconErrors) {
      const copy = { ...iconErrors };
      delete copy[editingAccount.id];
      setIconErrors(copy);
    }
    setEditingAccount(null);
  };

  const handleDelete = () => {
    if (editingAccount) {
      if (window.confirm(`Are you sure you want to remove ${editingAccount.name}?`)) {
        onDeleteAccount(editingAccount.id);
        setEditingAccount(null);
      }
    }
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

  const renderIcon = (account: Account) => {
    if (account.iconUrl && !iconErrors[account.id]) {
      return (
        <img
          src={account.iconUrl}
          alt={account.name}
          className="w-10 h-10 object-contain rounded-lg animate-fade-in"
          onError={() => {
            setIconErrors((prev) => ({ ...prev, [account.id]: true }));
          }}
        />
      );
    }
    return getIcon(account.type);
  };

  return (
    <main className="min-h-full bg-obsidian flex flex-col justify-start items-center px-6 py-16 relative w-full animate-slide-up-fade">
      
      {/* Title */}
      <div className="text-center space-y-3 mb-16 animate-fade-in flex flex-col items-center">
        <h1 className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-white via-gray-300 to-obsidian-text-muted bg-clip-text text-transparent uppercase">
          Obsidian Mail
        </h1>
        <p className="text-sm text-obsidian-text-muted tracking-widest uppercase">
          Select an account or use number shortcuts [1 - {accounts.length}]
        </p>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl w-full">
        {accounts.map((account, index) => (
          <div
            key={account.id}
            onClick={() => onSelectAccount(account.id)}
            onContextMenu={(e) => handleContextMenu(e, account)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelectAccount(account.id);
              }
            }}
            className="group text-left relative bg-obsidian-canvas border border-obsidian-border/40 rounded-2xl p-6 transition-all duration-200 hover:bg-obsidian-border/30 cursor-pointer flex flex-col justify-between h-48 focus:outline-none"
          >
            {/* Shortcut Badge Container */}
            <div className="absolute top-4 right-4 flex items-center z-10">
              <span className="bg-obsidian border border-obsidian-border/40 text-[10px] font-bold text-obsidian-text-muted px-2 py-0.5 rounded-md transition-colors flex items-center justify-center h-[24px]">
                {index + 1}
              </span>
            </div>

            {/* Platform Icon */}
            <div className="p-3 bg-obsidian rounded-xl border border-obsidian-border/40 transition-colors w-fit">
              {renderIcon(account)}
            </div>

            {/* Account Info */}
            <div>
              <h2 className="text-lg font-bold text-white transition-colors">
                {account.name}
              </h2>
              <p className="text-xs text-obsidian-text-muted truncate mt-1">
                {account.url}
              </p>
            </div>
          </div>
        ))}

        {/* Add Account Card */}
        <button
          onClick={() => setShowAddModal(true)}
          className="group relative bg-obsidian-canvas border-2 border-dashed border-obsidian-border/40 rounded-2xl p-6 transition-all duration-200 hover:bg-obsidian-border/30 cursor-pointer flex flex-col items-center justify-center h-48 focus:outline-none"
        >
          <div className="p-3 bg-obsidian rounded-full border border-obsidian-border/40 transition-colors mb-3">
            <svg className="w-6 h-6 text-obsidian-text-muted transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <span className="text-sm font-bold text-obsidian-text-muted transition-colors">
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
                onClick={() => {
                  setShowAddModal(false);
                  setNewIconUrl(undefined);
                }}
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

              {/* Custom Icon Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted block">Custom Icon (Optional)</label>
                <div className="flex items-center gap-4">
                  {newIconUrl ? (
                    <div className="relative">
                      <img src={newIconUrl} alt="Custom Preview" className="w-12 h-12 object-contain bg-obsidian p-1 rounded-xl border border-obsidian-border" />
                      <button
                        type="button"
                        onClick={() => setNewIconUrl(undefined)}
                        title="Remove custom icon"
                        className="absolute -top-1.5 -right-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-0.5 cursor-pointer transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-obsidian border-2 border-dashed border-obsidian-border rounded-xl text-obsidian-text-muted">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  )}

                  <label className="flex-1 cursor-pointer">
                    <span className="block w-full py-2.5 px-3 bg-obsidian border border-obsidian-border focus:border-purple-500/50 text-center rounded-xl text-xs font-bold text-obsidian-text-muted hover:text-white transition-all">
                      Choose Custom Logo Image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>
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

      {/* Edit Account Modal Overlay */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-obsidian-canvas border border-obsidian-border rounded-2xl p-8 shadow-2xl flex flex-col space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Edit Mailbox Settings</h3>
              <button
                onClick={() => setEditingAccount(null)}
                className="text-obsidian-text-muted hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Account Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g., Personal Outlook"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-obsidian border border-obsidian-border focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-obsidian-text-muted outline-none transition-colors"
                  required
                />
              </div>

              {/* Service Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted">Service Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
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
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full bg-obsidian border border-obsidian-border focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-obsidian-text-muted outline-none transition-colors"
                  required
                />
              </div>

              {/* Custom Icon Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted block">Custom Icon</label>
                <div className="flex items-center gap-4">
                  {editIconUrl ? (
                    <div className="relative">
                      <img src={editIconUrl} alt="Custom Preview" className="w-12 h-12 object-contain bg-obsidian p-1 rounded-xl border border-obsidian-border" />
                      <button
                        type="button"
                        onClick={() => setEditIconUrl(undefined)}
                        title="Remove custom icon"
                        className="absolute -top-1.5 -right-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-0.5 cursor-pointer transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-obsidian border-2 border-dashed border-obsidian-border rounded-xl text-obsidian-text-muted">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  )}

                  <label className="flex-1 cursor-pointer">
                    <span className="block w-full py-2.5 px-3 bg-obsidian border border-obsidian-border focus:border-purple-500/50 text-center rounded-xl text-xs font-bold text-obsidian-text-muted hover:text-white transition-all">
                      Choose Custom Logo Image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-1/3 py-3 px-4 border border-red-500/30 bg-red-950/20 hover:bg-red-500/20 text-red-400 font-bold text-sm rounded-xl transition-all cursor-pointer active:scale-98"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all cursor-pointer active:scale-98"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-obsidian-canvas border border-obsidian-border/60 rounded-xl shadow-2xl py-1.5 min-w-[170px] animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Reorder Left */}
          {accounts.indexOf(contextMenu.account) > 0 && (
            <button
              onClick={() => {
                onReorderAccounts(contextMenu.account.id, "left");
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500/10 hover:text-purple-300 transition-colors flex items-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-obsidian-text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Move Left
            </button>
          )}

          {/* Reorder Right */}
          {accounts.indexOf(contextMenu.account) < accounts.length - 1 && (
            <button
              onClick={() => {
                onReorderAccounts(contextMenu.account.id, "right");
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500/10 hover:text-purple-300 transition-colors flex items-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-obsidian-text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              Move Right
            </button>
          )}

          {(accounts.indexOf(contextMenu.account) > 0 || accounts.indexOf(contextMenu.account) < accounts.length - 1) && (
            <div className="h-px bg-obsidian-border/40 my-1" />
          )}

          {/* Edit Account */}
          <button
            onClick={() => {
              setEditingAccount(contextMenu.account);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500/10 hover:text-purple-300 transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4 text-obsidian-text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            Edit Settings
          </button>
          
          <div className="h-px bg-obsidian-border/40 my-1" />
          
          {/* Delete Account */}
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to remove ${contextMenu.account.name}?`)) {
                onDeleteAccount(contextMenu.account.id);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Account
          </button>
        </div>
      )}
    </main>
  );
}
