import { useState, useEffect, useRef } from "react";
import { Account, Profile } from "../App";

interface AmbientGridProps {
  accounts: Account[]; // Filtered active profile accounts
  allAccounts: Account[]; // All accounts globally
  profiles: Profile[];
  currentProfileId: string;
  theme: "dark" | "light";
  minimizeToTray: boolean;
  onSelectAccount: (id: string) => void;
  onAddAccount: (name: string, type: "gmail" | "outlook" | "icloud", url: string, iconUrl?: string, group?: string) => void;
  onEditAccount: (id: string, name: string, type: "gmail" | "outlook" | "icloud", url: string, iconUrl?: string, group?: string, isPinned?: boolean) => void;
  onDeleteAccount: (id: string) => void;
  onReorderAccounts: (id: string, direction: "left" | "right") => void;
  onTogglePinAccount: (id: string) => void;
  onAddProfile: (name: string) => void;
  onDeleteProfile: (id: string) => void;
  onRenameProfile: (id: string, newName: string) => void;
  onSelectProfile: (id: string) => void;
  onSetTheme: (theme: "dark" | "light") => void;
  onSetMinimizeToTray: (enabled: boolean) => void;
  onClearCache: (accountId: string) => void;
  onClearAllCache: () => void;
  onLaunchWorkspace: () => void;
  autoOpenSearch?: boolean;
  onResetSearch?: () => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  runningAccountIds: string[];
  onCloseAccount: (id: string) => void;
}

export default function AmbientGrid({
  accounts,
  allAccounts,
  profiles,
  currentProfileId,
  theme,
  minimizeToTray,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onReorderAccounts,
  onTogglePinAccount,
  onAddProfile,
  onDeleteProfile,
  onRenameProfile,
  onSelectProfile,
  onSetTheme,
  onSetMinimizeToTray,
  onClearCache,
  onClearAllCache,
  onLaunchWorkspace,
  autoOpenSearch,
  onResetSearch,
  showConfirm,
  runningAccountIds,
  onCloseAccount,
}: AmbientGridProps) {
  // Account modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"gmail" | "outlook" | "icloud">("gmail");
  const [newUrl, setNewUrl] = useState("https://mail.google.com");
  const [newIconUrl, setNewIconUrl] = useState<string | undefined>(undefined);

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"gmail" | "outlook" | "icloud">("gmail");
  const [editUrl, setEditUrl] = useState("");
  const [editIconUrl, setEditIconUrl] = useState<string | undefined>(undefined);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    account: Account;
  } | null>(null);

  // Profile Context Menu state
  const [profileContextMenu, setProfileContextMenu] = useState<{
    x: number;
    y: number;
    profile: Profile;
  } | null>(null);

  // Profile modals state
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [renamingProfileId, setRenamingProfileId] = useState<string | null>(null);
  const [renameProfileName, setRenameProfileName] = useState("");

  // Search Modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);

  // Settings Modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "cache" | "about">("general");

  // Track image load errors to fallback to default SVG
  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Trigger search modal from parent shortcut event
  useEffect(() => {
    if (autoOpenSearch) {
      setShowSearchModal(true);
      if (onResetSearch) {
        onResetSearch();
      }
    }
  }, [autoOpenSearch, onResetSearch]);

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
      if (profileContextMenu) setProfileContextMenu(null);
    };
    window.addEventListener("click", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
    };
  }, [contextMenu, profileContextMenu]);

  // Keyboard shortcut listener for numbers (1-9) and Search Command (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spawn Search Modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearchModal(true);
        return;
      }

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

  // Handle Arrow key navigation in Search Modal
  const filteredSearchAccounts = allAccounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setSelectedSearchIdx(0);
  }, [searchQuery]);

  useEffect(() => {
    if (showSearchModal) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
    }
  }, [showSearchModal]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIdx((prev) => (prev + 1) % Math.max(1, filteredSearchAccounts.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIdx((prev) => (prev - 1 + filteredSearchAccounts.length) % Math.max(1, filteredSearchAccounts.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredSearchAccounts[selectedSearchIdx];
      if (target) {
        onSelectAccount(target.id);
        setShowSearchModal(false);
      }
    } else if (e.key === "Escape") {
      setShowSearchModal(false);
    }
  };

  // Automatically update default URL based on type in Add Modal
  useEffect(() => {
    if (newType === "gmail") setNewUrl("https://mail.google.com");
    else if (newType === "outlook") setNewUrl("https://outlook.live.com");
    else if (newType === "icloud") setNewUrl("https://www.icloud.com/mail");
  }, [newType]);

  const handleContextMenu = (e: React.MouseEvent, account: Account) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      account,
    });
  };

  const handleProfileContextMenu = (e: React.MouseEvent, profile: Profile) => {
    e.preventDefault();
    e.stopPropagation();
    setProfileContextMenu({
      x: e.clientX,
      y: e.clientY,
      profile,
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
    
    onAddAccount(newName, newType, newUrl, finalIconUrl, "");
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
    
    onEditAccount(editingAccount.id, editName, editType, editUrl, finalIconUrl, "");
    if (editingAccount.id in iconErrors) {
      const copy = { ...iconErrors };
      delete copy[editingAccount.id];
      setIconErrors(copy);
    }
    setEditingAccount(null);
  };

  const handleDelete = () => {
    if (editingAccount) {
      showConfirm(
        "Delete Mailbox",
        `Are you sure you want to remove ${editingAccount.name}?`,
        () => {
          onDeleteAccount(editingAccount.id);
        }
      );
      setEditingAccount(null);
    }
  };

  const handleAddProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onAddProfile(newProfileName.trim());
    setNewProfileName("");
    setShowAddProfileModal(false);
  };

  const handleRenameProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingProfileId || !renameProfileName.trim()) return;
    onRenameProfile(renamingProfileId, renameProfileName.trim());
    setRenamingProfileId(null);
    setRenameProfileName("");
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

  const renderSearchIcon = (account: Account) => {
    if (account.iconUrl && !iconErrors[account.id]) {
      return (
        <img
          src={account.iconUrl}
          alt={account.name}
          className="w-5 h-5 object-contain rounded-md animate-fade-in"
          onError={() => {
            setIconErrors((prev) => ({ ...prev, [account.id]: true }));
          }}
        />
      );
    }
    switch (account.type) {
      case "gmail":
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        );
      case "outlook":
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.38-1.12-2.5-2.5-2.5s-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5zm-5 6.75C8.89 18.75 4 17.58 4 14.5V9.5c0-3.08 4.89-4.25 7.5-4.25s7.5 1.17 7.5 4.25v5c0 3.08-4.89 4.25-7.5 4.25z" />
          </svg>
        );
      case "icloud":
        return (
          <svg className="w-5 h-5 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
        );
    }
  };

  // Recent accounts tracking
  const recentAccounts = accounts
    .filter((acc) => acc.lastAccessed > 0)
    .sort((a, b) => b.lastAccessed - a.lastAccessed)
    .slice(0, 3);

  // Render a standard account card
  const renderCard = (account: Account, globalIndex: number) => (
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
      className="group text-left relative bg-obsidian-canvas rounded-2xl p-6 transition-all duration-200 hover:bg-obsidian-border/30 cursor-pointer flex flex-col justify-between h-48 focus:outline-none"
    >
      {/* Shortcut Badge Container */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
        {account.isPinned && (
          <svg className="w-3.5 h-3.5 text-purple-400 fill-current" viewBox="0 0 24 24">
            <title>Pinned Favorite</title>
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        )}
        <span className="bg-obsidian text-[10px] font-bold text-obsidian-text-muted px-2 py-0.5 rounded-md transition-colors flex items-center justify-center h-[24px]">
          {globalIndex + 1}
        </span>
      </div>

      {/* Platform Icon with Glowing Status Indicator */}
      <div className="relative p-3 bg-obsidian rounded-xl transition-colors w-fit">
        {renderIcon(account)}
        {runningAccountIds.includes(account.id) && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" title="Running Instance">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
        )}
      </div>

      {/* Account Info */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-white transition-colors truncate">
            {account.name}
          </h2>
        </div>
        <p className="text-xs text-obsidian-text-muted truncate mt-1">
          {account.url}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <main className="min-h-full bg-obsidian flex flex-col justify-start items-center px-6 py-16 relative w-full animate-slide-up-fade">
        
        {/* Responsive Header: Obsidian Mail Title & Profiles Tab Switcher & Settings */}
        <div className="flex flex-col md:flex-row md:items-center justify-between max-w-4xl w-full mb-8 gap-4">
          <div className="flex flex-col text-left">
            <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-white via-gray-300 to-obsidian-text-muted bg-clip-text text-transparent uppercase truncate">
              Obsidian Mail
            </h1>
            <p className="text-[10px] text-obsidian-text-muted tracking-widest uppercase mt-1">
              Workspace Hub
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
            {/* Profiles Switcher Tab Bar */}
            <div className="flex items-center gap-1.5 bg-obsidian-canvas/60 p-1 rounded-full relative z-20 overflow-x-auto max-w-full">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProfile(p.id)}
                  onContextMenu={(e) => handleProfileContextMenu(e, p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    currentProfileId === p.id
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/10"
                      : "text-obsidian-text-muted hover:text-white"
                  }`}
                >
                  {p.name}
                </button>
              ))}
              <button
                onClick={() => setShowAddProfileModal(true)}
                title="Create New Profile"
                className="p-1.5 rounded-full hover:bg-obsidian text-obsidian-text-muted hover:text-purple-400 cursor-pointer transition-colors flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>

            {/* Search button */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2.5 rounded-xl bg-obsidian-canvas hover:bg-purple-500/10 text-obsidian-text-muted hover:text-purple-400 transition-all cursor-pointer flex items-center justify-center active:scale-95 shrink-0"
              title="Search Mailboxes (Ctrl+K)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 rounded-xl bg-obsidian-canvas hover:bg-purple-500/10 text-obsidian-text-muted hover:text-purple-400 transition-all cursor-pointer flex items-center justify-center active:scale-95 shrink-0"
              title="Open Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Recent Accounts Row */}
        {recentAccounts.length > 0 && (
          <div className="flex items-center gap-3 mb-8 max-w-4xl w-full bg-obsidian-canvas/30 px-4 py-2.5 rounded-2xl text-xs select-none animate-fade-in">
            <span className="font-bold text-obsidian-text-muted uppercase tracking-wider mr-2">Recent:</span>
            <div className="flex flex-wrap gap-2">
              {recentAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => onSelectAccount(acc.id)}
                  className="px-2.5 py-1 bg-obsidian hover:bg-purple-500/10 rounded-lg text-white font-medium cursor-pointer transition-all hover:text-purple-300 flex items-center gap-1.5 active:scale-95"
                >
                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                    {acc.iconUrl && !iconErrors[acc.id] ? (
                      <img src={acc.iconUrl} alt="" className="w-3.5 h-3.5 object-contain" />
                    ) : (
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        acc.type === 'gmail' ? 'bg-red-500' : acc.type === 'outlook' ? 'bg-blue-500' : 'bg-sky-400'
                      }`} />
                    )}
                  </div>
                  {acc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Flat Cards Grid */}
        <div className="max-w-4xl w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full mb-8">
            {accounts.map((account) => renderCard(account, allAccounts.indexOf(account)))}
            
            {/* Add Account Card Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="group relative bg-obsidian-canvas rounded-2xl p-6 transition-all duration-200 hover:bg-obsidian-border/30 cursor-pointer flex flex-col items-center justify-center h-48 focus:outline-none w-full"
            >
              <div className="p-3 bg-obsidian rounded-full transition-colors mb-3">
                <svg className="w-6 h-6 text-obsidian-text-muted transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-sm font-bold text-obsidian-text-muted transition-colors">
                Add Account
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Modals outside of main container to preserve 100% viewport relative positioning */}
      
      {/* Add Account Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-obsidian-canvas rounded-2xl p-8 shadow-2xl flex flex-col space-y-6">
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
                  className="w-full bg-obsidian focus:bg-obsidian/85 rounded-xl px-4 py-2.5 text-sm text-white placeholder-obsidian-text-muted outline-none transition-colors"
                  required
                />
              </div>

              {/* Service Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted">Service Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-obsidian focus:bg-obsidian/85 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors cursor-pointer"
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
                  className="w-full bg-obsidian focus:bg-obsidian/85 rounded-xl px-4 py-2.5 text-sm text-white placeholder-obsidian-text-muted outline-none transition-colors"
                  required
                />
              </div>



              {/* Custom Icon Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted block">Custom Icon (Optional)</label>
                <div className="flex items-center gap-4">
                  {newIconUrl ? (
                    <div className="relative">
                      <img src={newIconUrl} alt="Custom Preview" className="w-12 h-12 object-contain bg-obsidian p-1 rounded-xl" />
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
                    <div className="w-12 h-12 flex items-center justify-center bg-obsidian rounded-xl text-obsidian-text-muted">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  )}

                  <label className="flex-1 cursor-pointer">
                    <span className="block w-full py-2.5 px-3 bg-obsidian focus:bg-purple-600/20 text-center rounded-xl text-xs font-bold text-obsidian-text-muted hover:text-white transition-all">
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
                className="w-full mt-4 py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all cursor-pointer active:scale-98"
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
          <div className="w-full max-w-md bg-obsidian-canvas rounded-2xl p-8 shadow-2xl flex flex-col space-y-6">
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
                  className="w-full bg-obsidian focus:bg-obsidian/85 rounded-xl px-4 py-2.5 text-sm text-white placeholder-obsidian-text-muted outline-none transition-colors"
                  required
                />
              </div>

              {/* Service Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted">Service Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="w-full bg-obsidian focus:bg-obsidian/85 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors cursor-pointer"
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
                  className="w-full bg-obsidian focus:bg-obsidian/85 rounded-xl px-4 py-2.5 text-sm text-white placeholder-obsidian-text-muted outline-none transition-colors"
                  required
                />
              </div>



              {/* Custom Icon Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted block">Custom Icon</label>
                <div className="flex items-center gap-4">
                  {editIconUrl ? (
                    <div className="relative">
                      <img src={editIconUrl} alt="Custom Preview" className="w-12 h-12 object-contain bg-obsidian p-1 rounded-xl" />
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
                    <div className="w-12 h-12 flex items-center justify-center bg-obsidian rounded-xl text-obsidian-text-muted">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  )}

                  <label className="flex-1 cursor-pointer">
                    <span className="block w-full py-2.5 px-3 bg-obsidian focus:bg-purple-600/20 text-center rounded-xl text-xs font-bold text-obsidian-text-muted hover:text-white transition-all">
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
                  className="w-1/3 py-3 px-4 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold text-sm rounded-xl transition-all cursor-pointer active:scale-98"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all cursor-pointer active:scale-98"
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
          className="fixed z-50 bg-obsidian-canvas rounded-xl shadow-2xl py-1.5 min-w-[170px] animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Toggle Favorite/Pin */}
          <button
            onClick={() => {
              onTogglePinAccount(contextMenu.account.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500/10 hover:text-purple-300 transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4 text-obsidian-text-muted fill-current" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            {contextMenu.account.isPinned ? "Unpin Favorite" : "Pin Favorite"}
          </button>

          <div className="h-px bg-obsidian-border/10 my-1" />

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

          <div className="h-px bg-obsidian-border/10 my-1" />

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
          
          <div className="h-px bg-obsidian-border/10 my-1" />
          
          {/* Delete Account */}
          <button
            onClick={() => {
              showConfirm(
                "Delete Mailbox",
                `Are you sure you want to remove ${contextMenu.account.name}?`,
                () => onDeleteAccount(contextMenu.account.id)
              );
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Account
          </button>

          <div className="h-px bg-obsidian-border/10 my-1" />

          {/* Close Mailbox Instance (Only if running) */}
          {runningAccountIds.includes(contextMenu.account.id) && (
            <button
              onClick={() => {
                onCloseAccount(contextMenu.account.id);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 transition-colors flex items-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
              </svg>
              Close Mailbox
            </button>
          )}

          {/* Clear Cache */}
          <button
            onClick={() => {
              showConfirm(
                "Clear Cache",
                `Are you sure you want to clear all data and cache for ${contextMenu.account.name}? This will log you out of this instance.`,
                () => onClearCache(contextMenu.account.id)
              );
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-yellow-400/90 hover:bg-yellow-500/10 hover:text-yellow-300 transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Cache
          </button>
        </div>
      )}

      {/* Profile Context Menu */}
      {profileContextMenu && (
        <div
          style={{ top: profileContextMenu.y, left: profileContextMenu.x }}
          className="fixed z-50 bg-obsidian-canvas rounded-xl shadow-2xl py-1.5 min-w-[150px] animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Launch Workspace */}
          {accounts.length > 0 && (
            <>
              <button
                onClick={() => {
                  onLaunchWorkspace();
                  setProfileContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500/10 hover:text-purple-300 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 21h-1l1.5-6.5h-5c-.77 0-1.17-.46-1-.9L8 3.5h7L13.5 10h5c.57 0 .86.3.7.83L15 21h-4z" />
                </svg>
                Launch Workspace
              </button>
              <div className="h-px bg-obsidian-border/10 my-1" />
            </>
          )}

          {/* Rename Profile */}
          <button
            onClick={() => {
              setRenamingProfileId(profileContextMenu.profile.id);
              setRenameProfileName(profileContextMenu.profile.name);
              setProfileContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500/10 hover:text-purple-300 transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4 text-obsidian-text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            Rename Profile
          </button>

          {profiles.length > 1 && (
            <>
              <div className="h-px bg-obsidian-border/10 my-1" />
              {/* Delete Profile */}
              <button
                onClick={() => {
                  showConfirm(
                    "Delete Profile",
                    `Delete profile "${profileContextMenu.profile.name}" and all its mailboxes? This action cannot be undone.`,
                    () => onDeleteProfile(profileContextMenu.profile.id)
                  );
                  setProfileContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Profile
              </button>
            </>
          )}
        </div>
      )}

      {/* Add Profile Modal */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-obsidian-canvas rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Workspace Profile</h3>
            <form onSubmit={handleAddProfileSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted">Profile Name</label>
                <input
                  type="text"
                  placeholder="e.g. Clients Profile, Client Work"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full bg-obsidian focus:bg-obsidian/85 rounded-xl px-4 py-2 text-sm text-white placeholder-obsidian-text-muted outline-none transition-colors"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(false)}
                  className="w-1/2 py-2 px-4 bg-obsidian hover:bg-obsidian-border/20 text-obsidian-text-muted hover:text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Profile Modal */}
      {renamingProfileId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-obsidian-canvas rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
            <h3 className="text-lg font-bold text-white">Rename Workspace Profile</h3>
            <form onSubmit={handleRenameProfileSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-obsidian-text-muted">New Profile Name</label>
                <input
                  type="text"
                  value={renameProfileName}
                  onChange={(e) => setRenameProfileName(e.target.value)}
                  className="w-full bg-obsidian focus:bg-obsidian/85 rounded-xl px-4 py-2 text-sm text-white outline-none transition-colors"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingProfileId(null)}
                  className="w-1/2 py-2 px-4 bg-obsidian hover:bg-obsidian-border/20 text-obsidian-text-muted hover:text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Search Modal (Ctrl+K Command Palette) */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center w-screen h-screen bg-black/60 backdrop-blur-sm overflow-hidden animate-fade-in" onClick={() => setShowSearchModal(false)}>
          <div
            className="relative mt-[10vh] w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden bg-obsidian-canvas rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 bg-obsidian/30">
              <svg className="w-5 h-5 text-obsidian-text-muted mr-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search mailboxes by name or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-transparent py-4 text-sm text-white placeholder-obsidian-text-muted outline-none"
              />
              <span className="text-[10px] bg-obsidian px-1.5 py-0.5 rounded text-obsidian-text-muted font-bold">
                ESC
              </span>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 max-h-[50vh]">
              {filteredSearchAccounts.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-obsidian-text-muted">
                  No matching mailboxes found.
                </div>
              ) : (
                filteredSearchAccounts.map((acc, idx) => {
                  const isSelected = idx === selectedSearchIdx;
                  const profileName = profiles.find(p => p.id === acc.profileId)?.name || "Default";
                  return (
                    <div
                      key={acc.id}
                      onClick={() => {
                        onSelectAccount(acc.id);
                        setShowSearchModal(false);
                      }}
                      onMouseEnter={() => setSelectedSearchIdx(idx)}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between rounded-xl transition-colors ${
                        isSelected ? "bg-purple-600/20 text-purple-300" : "text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center">
                          {renderSearchIcon(acc)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{acc.name}</span>
                          <span className="text-[10px] text-obsidian-text-muted truncate max-w-[300px]">{acc.url}</span>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-obsidian-text-muted bg-obsidian px-2 py-0.5 rounded-md">
                        {profileName}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings & About Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowSettingsModal(false)}>
          <div
            className="w-full max-w-2xl h-[500px] bg-obsidian-canvas rounded-2xl shadow-2xl flex overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar Tabs */}
            <div className="w-1/3 bg-obsidian/30 py-6 px-4 flex flex-col justify-between">
              <div className="space-y-6">
                <span className="text-xs font-extrabold uppercase tracking-widest text-obsidian-text-muted px-2">Settings</span>
                <nav className="flex flex-col gap-1">
                  <button
                    onClick={() => setSettingsTab("general")}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      settingsTab === "general" ? "bg-purple-600/10 text-purple-400" : "text-obsidian-text-muted hover:text-white"
                    }`}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setSettingsTab("cache")}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      settingsTab === "cache" ? "bg-purple-600/10 text-purple-400" : "text-obsidian-text-muted hover:text-white"
                    }`}
                  >
                    Cache Control
                  </button>
                  <button
                    onClick={() => setSettingsTab("about")}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      settingsTab === "about" ? "bg-purple-600/10 text-purple-400" : "text-obsidian-text-muted hover:text-white"
                    }`}
                  >
                    About App
                  </button>
                </nav>
              </div>

              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2 bg-obsidian hover:bg-obsidian-border/30 hover:text-white text-obsidian-text-muted font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

            {/* Content Body */}
            <div className="w-2/3 p-8 overflow-y-auto flex flex-col justify-between h-full bg-obsidian-canvas">
              <div>
                {settingsTab === "general" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white pb-2">General Preferences</h3>

                    {/* Theme Toggle */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-obsidian-text-muted block">Aesthetic Theme</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onSetTheme("dark")}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                            theme === "dark"
                              ? "bg-purple-600/20 text-purple-400"
                              : "bg-obsidian text-obsidian-text-muted hover:text-white"
                          }`}
                        >
                          Charcoal Dark
                        </button>
                        <button
                          onClick={() => onSetTheme("light")}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                            theme === "light"
                              ? "bg-purple-600/20 text-purple-400"
                              : "bg-obsidian text-obsidian-text-muted hover:text-white"
                          }`}
                        >
                          Glass Light
                        </button>
                      </div>
                    </div>

                    {/* Minimize to Tray */}
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-xs font-bold uppercase text-white">Minimize to System Tray</label>
                        <span className="text-[10px] text-obsidian-text-muted">Hide application in tray on close requests</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={minimizeToTray}
                          onChange={(e) => onSetMinimizeToTray(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-obsidian rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-obsidian-text-muted peer-checked:after:bg-purple-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600/20"></div>
                      </label>
                    </div>
                  </div>
                )}

                {settingsTab === "cache" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white pb-2">Memory & Cache Control</h3>

                    {/* Active Mailbox Instances (RAM Control) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-obsidian-text-muted">Active Background Instances</span>
                        {runningAccountIds.length > 0 && (
                          <button
                            onClick={() => {
                              showConfirm(
                                "Close All Instances",
                                "Are you sure you want to close all active background mailbox instances and free up system memory?",
                                () => {
                                  runningAccountIds.forEach((id) => onCloseAccount(id));
                                }
                              );
                            }}
                            className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Close All
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-[150px] overflow-y-auto p-2 rounded-xl bg-obsidian/20">
                        {allAccounts.filter(acc => runningAccountIds.includes(acc.id)).map(acc => (
                          <div key={acc.id} className="flex items-center justify-between py-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                              <span className="font-semibold text-white">{acc.name}</span>
                            </div>
                            <button
                              onClick={() => onCloseAccount(acc.id)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg cursor-pointer transition-colors"
                            >
                              Close Instance
                            </button>
                          </div>
                        ))}
                        {allAccounts.filter(acc => runningAccountIds.includes(acc.id)).length === 0 && (
                          <div className="text-center py-4 text-xs text-obsidian-text-muted">No active background mailboxes.</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Clear individual cache list */}
                    <div className="space-y-3 pt-2 border-t border-obsidian-border/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-obsidian-text-muted block">Cache by account</span>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto p-2 rounded-xl bg-obsidian/20">
                        {allAccounts.map(acc => (
                          <div key={acc.id} className="flex items-center justify-between py-1 text-xs">
                            <span className="font-semibold">{acc.name}</span>
                            <button
                              onClick={() => onClearCache(acc.id)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-red-950/20 hover:bg-red-900/40 text-red-400 rounded-lg cursor-pointer transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        ))}
                        {allAccounts.length === 0 && (
                          <div className="text-center py-4 text-xs text-obsidian-text-muted">No accounts added yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Clear all cache button */}
                    <div className="pt-2 border-t border-obsidian-border/10">
                      <button
                        onClick={onClearAllCache}
                        className="w-full py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-98"
                      >
                        Clear All Caches
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === "about" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white pb-2">About Obsidian Mail</h3>
                    <div className="flex items-center gap-4 py-2">
                      <img src="/logo.png" alt="Mail App logo" className="w-16 h-16 object-contain" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">Obsidian Mail Desktop</span>
                        <span className="text-xs text-obsidian-text-muted">Version 0.1.1 (Wix/MSI Bundle)</span>
                        <span className="text-[10px] text-obsidian-text-muted mt-1">© 2026 Developer Workstation</span>
                      </div>
                    </div>
                    <p className="text-xs text-obsidian-text-muted leading-relaxed">
                      Obsidian Mail is designed to solve profile and cookie pollution for users who run multiple accounts under different environments. By programmatically isolating the WebView2 process directories, the client runs completely separate instances of popular services such as Gmail, iCloud, and Outlook.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
