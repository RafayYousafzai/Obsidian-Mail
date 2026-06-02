import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen bg-obsidian text-[#f3f4f6] flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      <div className="w-full max-w-md bg-obsidian-canvas border border-obsidian-border rounded-2xl p-8 shadow-2xl backdrop-blur-md flex flex-col items-center space-y-8 transition-all duration-300 hover:shadow-purple-500/5">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-obsidian-text-muted bg-clip-text text-transparent">
            Obsidian Industrial
          </h1>
          <p className="text-sm text-obsidian-text-muted">
            Tauri + React + Tailwind v4
          </p>
        </div>

        {/* Logos Container */}
        <div className="flex items-center gap-6 py-2">
          <a 
            href="https://vite.dev" 
            target="_blank" 
            className="group relative flex items-center justify-center p-3 rounded-xl bg-obsidian/40 border border-obsidian-border hover:border-purple-500/40 transition-all duration-300"
          >
            <img src="/vite.svg" className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" alt="Vite logo" />
          </a>
          <a 
            href="https://tauri.app" 
            target="_blank" 
            className="group relative flex items-center justify-center p-3 rounded-xl bg-obsidian/40 border border-obsidian-border hover:border-cyan-500/40 transition-all duration-300"
          >
            <img src="/tauri.svg" className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" alt="Tauri logo" />
          </a>
          <a 
            href="https://react.dev" 
            target="_blank" 
            className="group relative flex items-center justify-center p-3 rounded-xl bg-obsidian/40 border border-obsidian-border hover:border-blue-500/40 transition-all duration-300"
          >
            <img src={reactLogo} className="h-10 w-10 animate-[spin_20s_linear_infinite] transition-transform duration-300 group-hover:scale-110" alt="React logo" />
          </a>
        </div>

        {/* Form Section */}
        <form
          className="w-full flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <div className="relative">
            <input
              id="greet-input"
              className="w-full bg-obsidian/60 border border-obsidian-border focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-obsidian-text-muted outline-none transition-all duration-300 focus:ring-1 focus:ring-purple-500/20"
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Enter a name to greet..."
              value={name}
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-500/10 active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            Greet User
          </button>
        </form>

        {/* Output Section */}
        {greetMsg && (
          <div className="w-full p-4 rounded-xl bg-obsidian/30 border border-obsidian-border/50 text-center animate-fade-in">
            <p className="text-sm text-purple-200/90 font-medium">
              {greetMsg}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
