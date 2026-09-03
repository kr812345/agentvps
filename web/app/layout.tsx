import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentVPS - 24/7 Autonomous AI Agent VPS Provisioner & MCP Server',
  description: 'Turn any $4 VPS into an always-on, 24/7 autonomous AI software engineer. Supports Antigravity CLI, Claude Code, and Aider with built-in MCP server and Telegram mobile control.',
  keywords: ['ai agent', 'vps provisioner', 'mcp server', 'claude code', 'antigravity-cli', 'aider', 'hetzner', 'digitalocean'],
  authors: [{ name: 'AgentVPS Team' }],
  openGraph: {
    title: 'AgentVPS - 24/7 Autonomous AI Agent VPS Provisioner & MCP Server',
    description: 'Deploy persistent AI coding agents to any remote server in 60 seconds.',
    url: 'https://agentvps.vercel.app',
    siteName: 'AgentVPS',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="antialiased bg-[#080c14] text-slate-100 min-h-screen selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
