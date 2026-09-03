import { Command } from 'commander';
import pc from 'picocolors';
import { runMcpServer } from '../mcp/server.js';
import { ProvisionOrchestrator } from '../engine/orchestrator.js';
import { OSDetector } from '../engine/os-detector.js';
import { SSHClient } from '../engine/ssh.js';
import { CloudProviderEngine, CloudProviderType } from '../engine/cloud-providers.js';
import { AgentConfig, AgentType, ProvisionOptions } from '../types/index.js';
import { defaultLogger } from '../utils/logger.js';
import { runInteractiveWizard } from './wizard.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('agentvps')
    .description('Zero-touch 1-Click 24/7 Remote AI Agent VPS Provisioner & MCP Server')
    .version('1.0.0');

  // Default action when no arguments provided: Launch interactive wizard
  program.action(async () => {
    await runInteractiveWizard();
  });

  // Command: init (Interactive wizard)
  program
    .command('init')
    .description('Interactive setup wizard to configure a 24/7 AI agent on your VPS')
    .action(async () => {
      await runInteractiveWizard();
    });

  // Command: mcp
  program
    .command('mcp')
    .description('Start the Model Context Protocol (MCP) server on stdio')
    .action(async () => {
      await runMcpServer();
    });

  // Command: detect
  program
    .command('detect')
    .description('Inspect a remote VPS and detect OS, hardware, and Docker readiness')
    .requiredOption('-h, --host <host>', 'Remote VPS IP address or hostname')
    .option('-p, --port <port>', 'SSH port', '22')
    .option('-u, --user <user>', 'SSH username', 'root')
    .option('-P, --password <password>', 'SSH password')
    .option('-k, --key <keyPath>', 'Path to SSH private key')
    .action(async (opts) => {
      defaultLogger.info(`Connecting to ${opts.host}:${opts.port}...`);
      const ssh = new SSHClient({
        host: opts.host,
        port: parseInt(opts.port, 10),
        username: opts.user,
        password: opts.password,
        privateKey: opts.key ? await import('fs').then((f) => f.readFileSync(opts.key, 'utf-8')) : undefined,
      });

      try {
        await ssh.connect();
        defaultLogger.success(`SSH session established!`);
        const info = await OSDetector.probeRemoteSystem(ssh);
        ssh.disconnect();

        console.log('\n' + pc.bold('--- VPS System Report ---'));
        console.log(`${pc.cyan('OS:')} ${info.os.name} (${info.os.family} family, package manager: ${info.os.packageManager})`);
        console.log(`${pc.cyan('Architecture:')} ${info.arch}`);
        console.log(`${pc.cyan('CPU Cores:')} ${info.cpu.cores} (${info.cpu.model})`);
        console.log(`${pc.cyan('Memory:')} ${info.memory.totalMb} MB total (${info.memory.freeMb} MB free)`);
        console.log(`${pc.cyan('Disk:')} ${info.disk.totalGb} GB total (${info.disk.freeGb} GB free)`);
        console.log(`${pc.cyan('Docker:')} ${info.docker.installed ? `Installed (${info.docker.version})` : 'Not installed'}`);
        console.log(`${pc.cyan('Firewall:')} ${info.firewall.active ? `Active (${info.firewall.type})` : 'None / inactive'}`);
        console.log('-------------------------\n');
      } catch (err: any) {
        ssh.disconnect();
        defaultLogger.error(`Probe failed: ${err.message || String(err)}`);
        process.exit(1);
      }
    });

  // Command: setup
  program
    .command('setup')
    .description('Provision a 24/7 autonomous AI agent on the remote VPS')
    .option('-h, --host <host>', 'Remote VPS IP address or hostname')
    .option('-p, --port <port>', 'SSH port', '22')
    .option('-u, --user <user>', 'SSH username', 'root')
    .option('-P, --password <password>', 'SSH password')
    .option('-k, --key <keyPath>', 'Path to SSH private key')
    .option('-a, --agent <agentType>', 'Agent to deploy (antigravity-cli, claude-code, aider, openhands)', 'antigravity-cli')
    .option('--gemini-key <key>', 'Gemini API Key')
    .option('--anthropic-key <key>', 'Anthropic API Key')
    .option('--openai-key <key>', 'OpenAI API Key')
    .option('--github-token <token>', 'GitHub Personal Access Token')
    .option('--telegram-token <token>', 'Telegram Bot Token')
    .option('--telegram-chat-id <chatId>', 'Telegram Admin Chat ID')
    .option('--web-terminal', 'Enable browser Web Terminal on port 7681', false)
    .action(async (opts) => {
      // If host is omitted, fallback to interactive wizard
      if (!opts.host) {
        await runInteractiveWizard();
        return;
      }

      console.log(pc.bold(pc.cyan('\n🚀 AgentVPS 1-Click Provisioner\n')));
      defaultLogger.info(`Target VPS: ${opts.host} | Agent: ${opts.agent}`);

      const credentials = {
        host: opts.host,
        port: parseInt(opts.port, 10),
        username: opts.user,
        password: opts.password,
        privateKey: opts.key ? await import('fs').then((f) => f.readFileSync(opts.key, 'utf-8')) : undefined,
      };

      const envVars: Record<string, string> = {};
      if (opts.geminiKey) envVars['GEMINI_API_KEY'] = opts.geminiKey;
      if (opts.anthropicKey) envVars['ANTHROPIC_API_KEY'] = opts.anthropicKey;
      if (opts.openaiKey) envVars['OPENAI_API_KEY'] = opts.openaiKey;
      if (opts.githubToken) envVars['GITHUB_TOKEN'] = opts.githubToken;

      const agentConfig: AgentConfig = {
        type: opts.agent as AgentType,
        envVars,
      };

      const options: ProvisionOptions = {
        credentials,
        agent: agentConfig,
        enableWebTerminal: opts.webTerminal,
        webTerminalPort: 7681,
        onProgress: (step, status, details) => {
          if (status === 'in_progress') {
            console.log(pc.yellow('⏳ ') + pc.bold(step) + (details ? pc.dim(` - ${details}`) : ''));
          } else if (status === 'success') {
            console.log(pc.green('✔ ') + pc.bold(step) + (details ? pc.dim(` - ${details}`) : ''));
          } else if (status === 'failed') {
            console.log(pc.red('✖ ') + pc.bold(step) + (details ? pc.red(`: ${details}`) : ''));
          }
        },
      };

      if (opts.telegramToken && opts.telegramChatId) {
        options.telegram = {
          enabled: true,
          botToken: opts.telegramToken,
          adminChatId: opts.telegramChatId,
        };
      }

      const orchestrator = new ProvisionOrchestrator(credentials);

      try {
        await orchestrator.connect();
        const res = await orchestrator.provision(options);
        orchestrator.disconnect();

        if (res.success) {
          console.log('\n' + pc.green(pc.bold('════════════════════════════════════════════════════════════')));
          console.log(pc.green(pc.bold(`🎉 Deployment Completed Successfully in ${res.durationSeconds}s!`)));
          console.log(pc.green(pc.bold('════════════════════════════════════════════════════════════\n')));
          console.log(`• ${pc.bold('Active Agent:')} ${res.agent.type}`);
          console.log(`• ${pc.bold('Host:')} ${res.host}`);
          console.log(`• ${pc.bold('OS:')} ${res.systemInfo.os.name} (${res.systemInfo.arch})`);
          if (res.telegramConnected) {
            console.log(`• ${pc.bold('Telegram Gateway:')} Connected! Send /start to your bot.`);
          }
          if (res.webTerminalUrl) {
            console.log(`• ${pc.bold('Web Terminal:')} ${res.webTerminalUrl}`);
          }
          console.log(`• ${pc.bold('Service:')} systemd service 'agentvps' running 24/7 with auto-restart.\n`);
        } else {
          defaultLogger.error(`Provisioning failed: ${res.error}`);
          process.exit(1);
        }
      } catch (err: any) {
        orchestrator.disconnect();
        defaultLogger.error(`Error: ${err.message || String(err)}`);
        process.exit(1);
      }
    });

  // Command: cloud
  program
    .command('cloud')
    .description('1-Click spawn a brand new cloud VPS on Hetzner or DigitalOcean with pre-configured agent')
    .requiredOption('-p, --provider <provider>', 'Cloud provider: hetzner or digitalocean')
    .requiredOption('-t, --token <token>', 'Cloud provider API token')
    .option('-a, --agent <agentType>', 'Agent to deploy', 'antigravity-cli')
    .option('--gemini-key <key>', 'Gemini API Key')
    .option('--anthropic-key <key>', 'Anthropic API Key')
    .option('--openai-key <key>', 'OpenAI API Key')
    .option('--telegram-token <token>', 'Telegram Bot Token')
    .option('--telegram-chat-id <chatId>', 'Telegram Admin Chat ID')
    .action(async (opts) => {
      defaultLogger.info(`Spawning 1-click cloud VPS on ${opts.provider.toUpperCase()}...`);

      const envVars: Record<string, string> = {};
      if (opts.geminiKey) envVars['GEMINI_API_KEY'] = opts.geminiKey;
      if (opts.anthropicKey) envVars['ANTHROPIC_API_KEY'] = opts.anthropicKey;
      if (opts.openaiKey) envVars['OPENAI_API_KEY'] = opts.openaiKey;

      const telegram =
        opts.telegramToken && opts.telegramChatId
          ? {
              enabled: true,
              botToken: opts.telegramToken,
              adminChatId: opts.telegramChatId,
            }
          : undefined;

      try {
        const result = await CloudProviderEngine.provision({
          provider: opts.provider as CloudProviderType,
          apiToken: opts.token,
          agent: { type: opts.agent as AgentType, envVars },
          telegram,
        });

        console.log('\n' + pc.green(pc.bold('════════════════════════════════════════════════════════════')));
        console.log(pc.green(pc.bold('🎉 Cloud VPS Created Successfully!')));
        console.log(pc.green(pc.bold('════════════════════════════════════════════════════════════\n')));
        console.log(`• ${pc.bold('Provider:')} ${result.provider}`);
        console.log(`• ${pc.bold('Server ID:')} ${result.serverId}`);
        console.log(`• ${pc.bold('Server Name:')} ${result.serverName}`);
        console.log(`• ${pc.bold('Public IP:')} ${result.publicIp}`);
        console.log(`• ${pc.bold('Agent:')} ${result.agent}`);
        console.log(`• ${pc.bold('Status:')} ${result.status}`);
        console.log('\nSelf-provisioning cloud-init is currently executing. Your node will be ready in ~45 seconds.\n');
      } catch (err: any) {
        defaultLogger.error(`Cloud spawn failed: ${err.message || String(err)}`);
        process.exit(1);
      }
    });

  // Command: status
  program
    .command('status')
    .description('Check the live health and resource consumption of the remote 24/7 agent')
    .requiredOption('-h, --host <host>', 'Remote VPS IP address or hostname')
    .option('-p, --port <port>', 'SSH port', '22')
    .option('-u, --user <user>', 'SSH username', 'root')
    .option('-P, --password <password>', 'SSH password')
    .option('-k, --key <keyPath>', 'Path to SSH private key')
    .action(async (opts) => {
      const credentials = {
        host: opts.host,
        port: parseInt(opts.port, 10),
        username: opts.user,
        password: opts.password,
        privateKey: opts.key ? await import('fs').then((f) => f.readFileSync(opts.key, 'utf-8')) : undefined,
      };

      const orchestrator = new ProvisionOrchestrator(credentials);
      try {
        await orchestrator.connect();
        const status = await orchestrator.getStatus();
        orchestrator.disconnect();

        console.log('\n' + pc.bold('--- Remote Agent Status ---'));
        console.log(`${pc.cyan('Container Running:')} ${status.containerRunning ? pc.green('Yes') : pc.red('No')}`);
        console.log(`${pc.cyan('Agent Session in Tmux:')} ${status.agentProcessRunning ? pc.green('Active') : pc.red('Inactive')}`);
        console.log(`${pc.cyan('Agent Type:')} ${status.agentType}`);
        console.log(`${pc.cyan('CPU Usage:')} ${status.cpuPercent}%`);
        console.log(`${pc.cyan('Memory Usage:')} ${status.memoryUsageMb} MB`);
        if (status.recentLogs.length > 0) {
          console.log(`\n${pc.cyan('Recent Logs:')}`);
          status.recentLogs.slice(-10).forEach((l) => console.log(pc.dim('  ' + l)));
        }
        console.log('---------------------------\n');
      } catch (err: any) {
        orchestrator.disconnect();
        defaultLogger.error(`Status check failed: ${err.message || String(err)}`);
        process.exit(1);
      }
    });

  // Command: curl
  program
    .command('curl')
    .description('Generate 1-line curl bootstrap script')
    .option('-a, --agent <agentType>', 'Agent type', 'antigravity-cli')
    .action((opts) => {
      const cmd = `curl -fsSL https://get.agentvps.dev/bootstrap.sh | bash -s -- --agent=${opts.agent}`;
      console.log('\n' + pc.bold('Run this command on your VPS:'));
      console.log(pc.cyan(cmd) + '\n');
    });

  return program;
}
