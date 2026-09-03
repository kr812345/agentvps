'use client';

import React, { useState } from 'react';
import { Check, Copy, Terminal, Key, Cpu, ShieldCheck } from 'lucide-react';

export default function CommandBuilder() {
  const [agent, setAgent] = useState('antigravity-cli');
  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState<'curl' | 'npx' | 'mcp'>('curl');
  const [copied, setCopied] = useState(false);

  const getCommand = () => {
    if (mode === 'npx') {
      let cmd = 'npx agentvps setup -h <YOUR_VPS_IP>';
      if (agent !== 'antigravity-cli') cmd += ` -a ${agent}`;
      if (apiKey) {
        if (agent === 'claude-code') cmd += ` --anthropic-key ${apiKey}`;
        else if (agent === 'antigravity-cli') cmd += ` --gemini-key ${apiKey}`;
        else cmd += ` --openai-key ${apiKey}`;
      }
      return cmd;
    }

    if (mode === 'mcp') {
      return JSON.stringify(
        {
          mcpServers: {
            agentvps: {
              command: 'npx',
              args: ['-y', 'agentvps', 'mcp'],
            },
          },
        },
        null,
        2
      );
    }

    // curl mode
    let cmd = 'curl -fsSL https://kr812345.github.io/agentvps/bootstrap.sh | bash';
    const flags: string[] = [];
    if (agent !== 'antigravity-cli') flags.push(`--agent=${agent}`);
    if (apiKey) {
      if (agent === 'claude-code') flags.push(`--anthropic-key=${apiKey}`);
      else if (agent === 'antigravity-cli') flags.push(`--gemini-key=${apiKey}`);
      else flags.push(`--openai-key=${apiKey}`);
    }

    if (flags.length > 0) {
      cmd += ` -s -- ${flags.join(' ')}`;
    }
    return cmd;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 glow-blue text-left w-full shadow-2xl backdrop-blur-sm">
      {/* Mode Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex space-x-1 sm:space-x-2">
          <button
            onClick={() => setMode('curl')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'curl'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            1-Line Curl (Direct VPS)
          </button>
          <button
            onClick={() => setMode('npx')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'npx'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Interactive CLI (npx)
          </button>
          <button
            onClick={() => setMode('mcp')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'mcp'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            MCP Config (Claude/Cursor)
          </button>
        </div>
        <span className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero-Knowledge Security</span>
        </span>
      </div>

      {mode !== 'mcp' && (
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>1. Target AI Agent</span>
            </label>
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="antigravity-cli">Antigravity CLI (Google DeepMind AGY)</option>
              <option value="claude-code">Claude Code (Anthropic)</option>
              <option value="aider">Aider (Pair Programmer)</option>
              <option value="openhands">OpenHands (All-Hands AI)</option>
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Key className="w-3.5 h-3.5 text-yellow-400" />
              <span>2. API Key (Optional)</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Leave blank to enter in terminal"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>
      )}

      {/* Terminal Command Output */}
      <div className="relative">
        <div className="bg-black/70 border border-slate-800 rounded-xl p-4 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto">
          {mode === 'mcp' ? (
            <pre className="text-blue-300">{getCommand()}</pre>
          ) : (
            <div className="flex items-center space-x-2 whitespace-nowrap">
              <span className="text-blue-500 select-none">$</span>
              <span>{getCommand()}</span>
            </div>
          )}
        </div>

        <button
          onClick={copyToClipboard}
          className="absolute right-3 top-3 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-medium transition shadow-md shadow-blue-600/30"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500 flex items-center space-x-1">
        <Terminal className="w-3 h-3 text-slate-400" />
        <span>Paste as root into any fresh Ubuntu, Debian, Fedora, Rocky, Arch, or Alpine VPS.</span>
      </p>
    </div>
  );
}
