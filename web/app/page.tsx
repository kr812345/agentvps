import React from 'react';
import CommandBuilder from '../components/CommandBuilder';
import {
  Server,
  Smartphone,
  Shield,
  Zap,
  Terminal,
  RefreshCw,
  GitBranch,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="border-b border-slate-800/80 sticky top-0 z-50 bg-[#080c14]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">
              ⚡
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                Agent<span className="text-blue-500">VPS</span>
              </span>
              <span className="ml-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800/60 text-blue-400">
                v1.0.0
              </span>
            </div>
          </div>

          <nav className="flex items-center space-x-6 text-sm">
            <a
              href="https://kr812345.github.io/agentvps/llms.txt"
              target="_blank"
              className="text-slate-400 hover:text-blue-400 transition hidden sm:inline"
            >
              llms.txt
            </a>
            <a
              href="https://github.com/kr812345/agentvps"
              target="_blank"
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition flex items-center space-x-2 font-medium"
            >
              <GitBranch className="w-4 h-4 text-blue-400" />
              <span>GitHub</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 text-center max-w-5xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-400 text-xs font-semibold mb-8">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Official Model Context Protocol (MCP) Server Included</span>
        </div>

        <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Turn any <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">$4 VPS</span> into an always-on 24/7 AI Engineer
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Stop draining your laptop battery. Deploy Antigravity CLI, Claude Code, or Aider to any remote cloud server in 60 seconds with persistent workspace state and mobile Telegram control.
        </p>

        {/* Interactive Command Builder */}
        <CommandBuilder />
      </section>

      {/* Live Terminal Simulation */}
      <section className="px-6 py-12 max-w-4xl mx-auto w-full">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-xs font-mono text-slate-400">agentvps_active_agent — tmux session</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              ● ONLINE 24/7
            </span>
          </div>

          <div className="p-5 font-mono text-xs text-slate-300 space-y-2 leading-relaxed bg-[#05080e]">
            <p className="text-slate-500"># System initialized via AgentVPS engine in 42 seconds</p>
            <p className="text-blue-400">🤖 [Agent: Antigravity CLI] Connected to workspace /opt/agentvps/workspace</p>
            <p className="text-emerald-400">📱 [Telegram Gateway] Mobile listener active (chat ID: 987654321)</p>
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 my-2">
              <p className="text-purple-400">💬 Prompt from Telegram: &quot;Fix issue #14: Add idempotency check to Stripe checkout session&quot;</p>
              <p className="text-slate-400 mt-1">➔ Analyzing src/api/checkout.ts...</p>
              <p className="text-slate-400">➔ Running vitest test suite... 14 passed (14)</p>
              <p className="text-emerald-400">➔ Created commit: &quot;fix: prevent double charge with idempotency key&quot;</p>
              <p className="text-blue-400">➔ Pushed to branch &quot;fix-stripe-idempotency&quot; &amp; sent summary to your phone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-4xl font-bold text-center text-white mb-12">
          Engineered for Persistent Autonomous Workflows
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400 mb-6">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">BYO-VPS Cost Arbitrage</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Why pay $200/month for hosted sandboxes? A $4/month Hetzner or DigitalOcean VPS gives you unmetered 24/7 compute with 100% data privacy.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/60 text-xs text-blue-400 font-mono">
              Hetzner €3.79/mo &bull; DigitalOcean $12/mo
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Telegram Mobile Gateway</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Control your agent on the subway. Prompt tasks, inspect Git diffs, and approve pull requests right from your smartphone.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/60 text-xs text-emerald-400 font-mono">
              Zero open ports &bull; Outbound long-polling
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-950 border border-purple-800/60 flex items-center justify-center text-purple-400 mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-OS Hardened Sandbox</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Docker isolation ensures agents cannot break your host OS. Automatically configures firewall rules and systemd crash watchdogs.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/60 text-xs text-purple-400 font-mono">
              Ubuntu, Debian, Fedora, Arch, Alpine
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-6 py-16 max-w-4xl mx-auto w-full">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8">
          The Cleanest Way to Run Autonomous Agents
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                <th className="p-4">Feature</th>
                <th className="p-4">Local Laptop</th>
                <th className="p-4">Hosted Cloud (Devin)</th>
                <th className="p-4 text-blue-400">AgentVPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="p-4 font-medium">Monthly Cost</td>
                <td className="p-4 text-slate-500">Free (Laptop wear)</td>
                <td className="p-4 text-red-400">$20 - $500+/mo</td>
                <td className="p-4 text-emerald-400 font-semibold">$4 - $10/mo</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">24/7 Overnight Execution</td>
                <td className="p-4 text-red-400">Terminates on sleep</td>
                <td className="p-4 text-emerald-400">Yes</td>
                <td className="p-4 text-emerald-400 font-semibold">Yes (systemd daemon)</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Data Privacy &amp; Sovereignty</td>
                <td className="p-4 text-emerald-400">100% Local</td>
                <td className="p-4 text-red-400">Third-party servers</td>
                <td className="p-4 text-emerald-400 font-semibold">100% Your VPS</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Mobile Phone Control</td>
                <td className="p-4 text-red-400">No</td>
                <td className="p-4 text-slate-500">Web app only</td>
                <td className="p-4 text-emerald-400 font-semibold">Native Telegram Bot</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Multi-Agent Switching</td>
                <td className="p-4 text-slate-500">Manual re-install</td>
                <td className="p-4 text-red-400">Locked to platform</td>
                <td className="p-4 text-emerald-400 font-semibold">Antigravity / Claude / Aider</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-12 mt-auto bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>AgentVPS &bull; Open Source under MIT License &bull; Designed for Autonomous AI Development</p>
          <div className="flex items-center space-x-6">
            <a href="https://kr812345.github.io/agentvps/llms.txt" className="hover:text-blue-400 transition">
              llms.txt
            </a>
            <a href="https://github.com/kr812345/agentvps" target="_blank" className="hover:text-white transition">
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
