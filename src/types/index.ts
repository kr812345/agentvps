export type SupportedDistroFamily = 'debian' | 'rhel' | 'arch' | 'alpine' | 'suse' | 'unknown';

export type SupportedArch = 'x86_64' | 'aarch64' | 'armv7l' | 'unknown';

export type AgentType = 'antigravity-cli' | 'claude-code' | 'aider' | 'openhands' | 'custom';

export interface ServerCredentials {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export interface SystemInfo {
  os: {
    id: string;
    name: string;
    version: string;
    family: SupportedDistroFamily;
    packageManager: 'apt' | 'dnf' | 'yum' | 'pacman' | 'apk' | 'zypper' | 'unknown';
  };
  arch: SupportedArch;
  memory: {
    totalMb: number;
    freeMb: number;
    usedMb: number;
  };
  disk: {
    totalGb: number;
    freeGb: number;
    usedGb: number;
    mount: string;
  };
  cpu: {
    cores: number;
    model: string;
  };
  docker: {
    installed: boolean;
    version?: string;
    running: boolean;
  };
  firewall: {
    active: boolean;
    type: 'ufw' | 'firewalld' | 'iptables' | 'none';
  };
  tailscale?: {
    installed: boolean;
    running: boolean;
  };
}

export interface AgentConfig {
  type: AgentType;
  version?: string;
  workspacePath?: string;
  envVars?: Record<string, string>;
  gitConfig?: {
    name?: string;
    email?: string;
    githubToken?: string;
  };
  autoRestart?: boolean;
  memoryLimitMb?: number;
  cpuLimit?: number;
  customCommand?: string;
}

export interface TelegramBridgeConfig {
  enabled: boolean;
  botToken: string;
  adminChatId: string;
  notifyOnDiff?: boolean;
  requireApproval?: boolean;
}

export interface ProvisionOptions {
  credentials: ServerCredentials;
  agent: AgentConfig;
  telegram?: TelegramBridgeConfig;
  enableWebTerminal?: boolean;
  webTerminalPort?: number;
  setupTailscale?: boolean;
  tailscaleAuthKey?: string;
  onProgress?: (step: string, status: 'pending' | 'in_progress' | 'success' | 'failed', details?: string) => void;
}

export interface ProvisionResult {
  success: boolean;
  host: string;
  systemInfo: SystemInfo;
  agent: AgentConfig;
  webTerminalUrl?: string;
  telegramConnected: boolean;
  stepsCompleted: string[];
  durationSeconds: number;
  error?: string;
}

export interface AgentStatusResult {
  host: string;
  containerRunning: boolean;
  agentProcessRunning: boolean;
  agentType: AgentType;
  uptimeSeconds: number;
  cpuPercent: number;
  memoryUsageMb: number;
  recentLogs: string[];
  lastActive: string;
}
