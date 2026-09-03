import { SSHClient } from './ssh.js';
import { OSDetector } from './os-detector.js';
import { RecipeEngine } from './recipes.js';
import {
  AgentConfig,
  AgentStatusResult,
  ProvisionOptions,
  ProvisionResult,
  ServerCredentials,
  SystemInfo,
} from '../types/index.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ProvisionOrchestrator {
  private ssh: SSHClient;

  constructor(credentials: ServerCredentials) {
    this.ssh = new SSHClient(credentials);
  }

  public async connect(): Promise<void> {
    await this.ssh.connect();
  }

  public disconnect(): void {
    this.ssh.disconnect();
  }

  public async probe(): Promise<SystemInfo> {
    return OSDetector.probeRemoteSystem(this.ssh);
  }

  public async provision(options: ProvisionOptions): Promise<ProvisionResult> {
    const startTime = Date.now();
    const stepsCompleted: string[] = [];

    const notify = (step: string, status: 'pending' | 'in_progress' | 'success' | 'failed', details?: string) => {
      if (options.onProgress) {
        options.onProgress(step, status, details);
      }
    };

    try {
      // Step 1: Probe System
      notify('System Probe', 'in_progress', 'Detecting OS distribution and architecture...');
      const systemInfo = await this.probe();
      stepsCompleted.push(`Detected OS: ${systemInfo.os.name} (${systemInfo.arch})`);
      notify('System Probe', 'success', `${systemInfo.os.name} | ${systemInfo.cpu.cores} Cores | ${systemInfo.memory.totalMb}MB RAM`);

      // Step 2: Run Universal OS Bootstrap
      notify('OS Bootstrap', 'in_progress', `Configuring package manager (${systemInfo.os.packageManager}) and Docker...`);
      
      const bootstrapScript = this.loadBootstrapScript();
      await this.ssh.uploadString(bootstrapScript, '/tmp/agentvps_bootstrap.sh', 0o755);
      
      const bootRes = await this.ssh.exec('/tmp/agentvps_bootstrap.sh', {
        timeoutMs: 300000, // 5 min timeout for Docker install
      });

      if (bootRes.code !== 0) {
        throw new Error(`Bootstrap failed with code ${bootRes.code}: ${bootRes.stderr || bootRes.stdout}`);
      }
      stepsCompleted.push('OS dependencies and Docker engine ready');
      notify('OS Bootstrap', 'success', 'Docker engine and firewall hardened');

      // Step 3: Configure Agent Environment & Secrets
      notify('Agent Configuration', 'in_progress', `Generating configuration for ${options.agent.type}...`);
      
      const envVars = { ...(options.agent.envVars || {}) };
      if (options.telegram && options.telegram.enabled) {
        envVars['TELEGRAM_BOT_TOKEN'] = options.telegram.botToken;
        envVars['TELEGRAM_ADMIN_CHAT_ID'] = options.telegram.adminChatId;
      }
      if (options.enableWebTerminal) {
        envVars['ENABLE_WEB_TERMINAL'] = 'true';
        envVars['WEB_TERMINAL_PORT'] = String(options.webTerminalPort || 7681);
      }

      const agentConfigWithEnv: AgentConfig = {
        ...options.agent,
        envVars,
      };

      const envContent = RecipeEngine.generateEnvFile(agentConfigWithEnv);
      await this.ssh.uploadString(envContent, '/opt/agentvps/.env', 0o600);

      const composeContent = RecipeEngine.generateDockerCompose(options);
      await this.ssh.uploadString(composeContent, '/opt/agentvps/docker-compose.yml', 0o644);

      stepsCompleted.push('Environment variables and compose manifest installed');
      notify('Agent Configuration', 'success', 'Configuration and secrets written');

      // Step 4: Transfer Runtime Files & Build / Prepare Image
      notify('Runtime Setup', 'in_progress', 'Preparing agent container sandbox...');
      
      const dockerfileContent = this.loadRuntimeFile('Dockerfile');
      const entrypointContent = this.loadRuntimeFile('entrypoint.sh');
      const telegramBridgeContent = this.loadRuntimeFile('telegram_bridge.py');

      await this.ssh.uploadString(dockerfileContent, '/opt/agentvps/runtime/Dockerfile', 0o644);
      await this.ssh.uploadString(entrypointContent, '/opt/agentvps/runtime/entrypoint.sh', 0o755);
      await this.ssh.uploadString(telegramBridgeContent, '/opt/agentvps/runtime/telegram_bridge.py', 0o755);

      // Build or check runtime image
      const checkImage = await this.ssh.exec('docker image inspect agentvps-runtime:latest >/dev/null 2>&1');
      if (checkImage.code !== 0) {
        notify('Runtime Setup', 'in_progress', 'Building agentvps-runtime container image (this may take 1-2 minutes)...');
        const buildRes = await this.ssh.exec('cd /opt/agentvps/runtime && docker build -t agentvps-runtime:latest .', {
          timeoutMs: 600000,
        });
        if (buildRes.code !== 0) {
          throw new Error(`Failed to build runtime image: ${buildRes.stderr || buildRes.stdout}`);
        }
      }

      stepsCompleted.push('Agent runtime container image ready');
      notify('Runtime Setup', 'success', 'Container sandbox ready');

      // Step 5: Configure 24/7 Systemd Service
      notify('Persistence Service', 'in_progress', 'Configuring systemd background daemon...');
      const systemdService = RecipeEngine.generateSystemdService();
      await this.ssh.uploadString(systemdService, '/etc/systemd/system/agentvps.service', 0o644);

      await this.ssh.exec('systemctl daemon-reload && systemctl enable --now agentvps');
      stepsCompleted.push('Systemd service agentvps enabled and started');
      notify('Persistence Service', 'success', '24/7 persistent daemon active');

      // Step 6: Health Check
      notify('Health Verification', 'in_progress', 'Checking container and agent process health...');
      await new Promise((r) => setTimeout(r, 4000));

      const statusRes = await this.ssh.exec('docker inspect -f "{{.State.Running}}" agentvps_active_agent 2>/dev/null');
      const isRunning = statusRes.stdout.trim() === 'true';

      if (!isRunning) {
        const logs = await this.ssh.exec('docker logs --tail 30 agentvps_active_agent 2>/dev/null');
        throw new Error(`Agent container failed to launch. Logs:\n${logs.stdout || logs.stderr}`);
      }

      stepsCompleted.push('Health check passed: container running');
      notify('Health Verification', 'success', 'All systems operational');

      const durationSeconds = Math.round((Date.now() - startTime) / 1000);

      let webTerminalUrl: string | undefined = undefined;
      if (options.enableWebTerminal) {
        webTerminalUrl = `http://${options.credentials.host}:${options.webTerminalPort || 7681}`;
      }

      return {
        success: true,
        host: options.credentials.host,
        systemInfo,
        agent: options.agent,
        webTerminalUrl,
        telegramConnected: Boolean(options.telegram?.enabled),
        stepsCompleted,
        durationSeconds,
      };
    } catch (err: any) {
      notify('Provisioning Error', 'failed', err.message);
      return {
        success: false,
        host: options.credentials.host,
        systemInfo: await this.probe().catch(() => ({}) as any),
        agent: options.agent,
        telegramConnected: false,
        stepsCompleted,
        durationSeconds: Math.round((Date.now() - startTime) / 1000),
        error: err.message || String(err),
      };
    }
  }

  public async getStatus(): Promise<AgentStatusResult> {
    const containerStatus = await this.ssh.exec('docker inspect -f "{{.State.Running}}" agentvps_active_agent 2>/dev/null');
    const isRunning = containerStatus.stdout.trim() === 'true';

    let uptime = 0;
    let cpuPercent = 0;
    let memoryUsageMb = 0;
    let agentType: any = 'unknown';
    let logs: string[] = [];

    if (isRunning) {
      // stats
      const stats = await this.ssh.exec(
        'docker stats --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}" agentvps_active_agent 2>/dev/null'
      );
      if (stats.stdout) {
        const [cpu, mem] = stats.stdout.split('|');
        cpuPercent = parseFloat(cpu?.replace('%', '') || '0');
        const memMatch = mem?.match(/([0-9.]+)(MiB|GiB)/);
        if (memMatch) {
          const val = parseFloat(memMatch[1]);
          memoryUsageMb = memMatch[2] === 'GiB' ? val * 1024 : val;
        }
      }

      // agent type from env
      const agentTypeRes = await this.ssh.exec(
        'docker exec agentvps_active_agent printenv AGENT_TYPE 2>/dev/null'
      );
      if (agentTypeRes.stdout) {
        agentType = agentTypeRes.stdout.trim();
      }

      // logs
      const logRes = await this.ssh.exec('docker logs --tail 25 agentvps_active_agent 2>/dev/null');
      if (logRes.stdout) {
        logs = logRes.stdout.split('\n').filter(Boolean);
      }
    }

    const tmuxCheck = await this.ssh.exec(
      'docker exec agentvps_active_agent tmux has-session -t agent_session 2>/dev/null'
    );
    const agentProcessRunning = tmuxCheck.code === 0;

    return {
      host: (this.ssh as any).credentials.host,
      containerRunning: isRunning,
      agentProcessRunning,
      agentType,
      uptimeSeconds: uptime,
      cpuPercent,
      memoryUsageMb: Math.round(memoryUsageMb),
      recentLogs: logs,
      lastActive: new Date().toISOString(),
    };
  }

  public async executeTask(prompt: string): Promise<{ success: boolean; output: string }> {
    // Sanitize prompt for tmux send-keys
    const sanitized = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    const cmd = `docker exec agentvps_active_agent tmux send-keys -t agent_session "${sanitized}" Enter`;
    const res = await this.ssh.exec(cmd);
    return {
      success: res.code === 0,
      output: res.code === 0 ? `Dispatched prompt to agent: "${prompt}"` : res.stderr,
    };
  }

  private loadBootstrapScript(): string {
    const candidates = [
      resolve(__dirname, '../../scripts/bootstrap.sh'),
      resolve(__dirname, '../scripts/bootstrap.sh'),
      resolve(process.cwd(), 'scripts/bootstrap.sh'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return readFileSync(p, 'utf-8');
    }
    throw new Error('Could not find scripts/bootstrap.sh');
  }

  private loadRuntimeFile(fileName: string): string {
    const candidates = [
      resolve(__dirname, `../../runtime/${fileName}`),
      resolve(__dirname, `../runtime/${fileName}`),
      resolve(process.cwd(), `runtime/${fileName}`),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return readFileSync(p, 'utf-8');
    }
    throw new Error(`Could not find runtime/${fileName}`);
  }
}
