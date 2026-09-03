import * as p from '@clack/prompts';
import pc from 'picocolors';
import { ProvisionOrchestrator } from '../engine/orchestrator.js';
import { CloudProviderEngine } from '../engine/cloud-providers.js';
import { AgentConfig, AgentType, ProvisionOptions } from '../types/index.js';
import { readFileSync, existsSync } from 'fs';

export async function runInteractiveWizard() {
  console.clear();
  p.intro(pc.bgCyan(pc.black(' 🚀 AgentVPS: 24/7 Autonomous AI Agent Provisioner ')));

  const mode = await p.select({
    message: 'How would you like to deploy your 24/7 AI Agent?',
    options: [
      { value: 'existing', label: 'Bring Your Own VPS', hint: 'I already have a VPS (IP & root password or SSH key)' },
      { value: 'cloud', label: '1-Click Cloud Spawn', hint: 'Auto-create a $4/mo VPS on Hetzner or DigitalOcean' },
    ],
  });

  if (p.isCancel(mode)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  // Choose Agent
  const agentType = (await p.select({
    message: 'Which autonomous AI agent would you like to run 24/7?',
    options: [
      { value: 'antigravity-cli', label: 'Antigravity CLI (Google DeepMind / AGY)', hint: 'Autonomous coding with skills' },
      { value: 'claude-code', label: 'Claude Code (Anthropic)', hint: 'Deep code refactoring & terminal agent' },
      { value: 'aider', label: 'Aider AI Pair Programmer', hint: 'Git-integrated pair programming' },
      { value: 'openhands', label: 'OpenHands (All-Hands AI)', hint: 'Multi-tool planning & sandbox execution' },
    ],
  })) as AgentType;

  if (p.isCancel(agentType)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  // Secrets collection
  const envVars: Record<string, string> = {};

  if (agentType === 'antigravity-cli') {
    const geminiKey = await p.password({
      message: 'Enter your Google Gemini API Key:',
      mask: '•',
    });
    if (p.isCancel(geminiKey)) return;
    if (geminiKey) envVars['GEMINI_API_KEY'] = geminiKey;
  } else if (agentType === 'claude-code') {
    const anthropicKey = await p.password({
      message: 'Enter your Anthropic Claude API Key:',
      mask: '•',
    });
    if (p.isCancel(anthropicKey)) return;
    if (anthropicKey) envVars['ANTHROPIC_API_KEY'] = anthropicKey;
  } else {
    const openaiKey = await p.password({
      message: 'Enter your OpenAI API Key:',
      mask: '•',
    });
    if (p.isCancel(openaiKey)) return;
    if (openaiKey) envVars['OPENAI_API_KEY'] = openaiKey;
  }

  // Telegram Mobile Gateway
  const enableTelegram = await p.confirm({
    message: 'Would you like to control your agent from your phone via Telegram?',
    initialValue: true,
  });

  let telegramConfig: { enabled: boolean; botToken: string; adminChatId: string } | undefined = undefined;
  if (enableTelegram) {
    const botToken = await p.text({
      message: 'Enter your Telegram Bot Token (from @BotFather):',
      placeholder: '123456:ABC-DEF1234ghIkl...',
    });
    if (p.isCancel(botToken)) return;

    const chatId = await p.text({
      message: 'Enter your numeric Telegram Chat ID (from @userinfobot):',
      placeholder: '987654321',
    });
    if (p.isCancel(chatId)) return;

    if (botToken && chatId) {
      telegramConfig = {
        enabled: true,
        botToken: botToken as string,
        adminChatId: chatId as string,
      };
    }
  }

  if (mode === 'cloud') {
    // 1-Click Cloud Spawn Flow
    const provider = await p.select({
      message: 'Select cloud provider:',
      options: [
        { value: 'hetzner', label: 'Hetzner Cloud', hint: 'Starting at €3.79/mo (Best value in Europe/US)' },
        { value: 'digitalocean', label: 'DigitalOcean', hint: 'Starting at $12/mo' },
      ],
    });
    if (p.isCancel(provider)) return;

    const apiToken = await p.password({
      message: `Enter your ${provider === 'hetzner' ? 'Hetzner Cloud' : 'DigitalOcean'} API Token:`,
      mask: '•',
    });
    if (p.isCancel(apiToken)) return;

    const spinner = p.spinner();
    spinner.start(`Spawning cloud VPS on ${String(provider).toUpperCase()}...`);

    try {
      const result = await CloudProviderEngine.provision({
        provider: provider as any,
        apiToken: apiToken as string,
        agent: { type: agentType, envVars },
        telegram: telegramConfig,
      });

      spinner.stop(pc.green('Cloud VPS initialized successfully!'));
      p.note(
        `Server ID: ${result.serverId}\nPublic IP: ${result.publicIp}\nRegion: ${result.region}\nStatus: ${result.status}\n\nThe server is executing cloud-init self-provisioning. It will be online in ~45s.`,
        'Server Details'
      );
      p.outro(pc.green('🎉 Your 24/7 AI Agent cloud node is spinning up!'));
    } catch (err: any) {
      spinner.stop(pc.red('Cloud provisioning failed!'));
      p.note(err.message || String(err), 'Error');
    }
  } else {
    // Existing VPS Flow
    const host = await p.text({
      message: 'Enter your VPS IP address or hostname:',
      placeholder: '194.23.45.67',
      validate: (v) => (!v ? 'IP address is required' : undefined),
    });
    if (p.isCancel(host)) return;

    const authType = await p.select({
      message: 'Select SSH authentication method:',
      options: [
        { value: 'password', label: 'Root Password' },
        { value: 'key', label: 'SSH Private Key File' },
      ],
    });
    if (p.isCancel(authType)) return;

    let password = '';
    let privateKey = '';

    if (authType === 'password') {
      const pass = await p.password({
        message: 'Enter your root password:',
        mask: '•',
      });
      if (p.isCancel(pass)) return;
      password = pass as string;
    } else {
      const keyPath = await p.text({
        message: 'Enter path to SSH private key:',
        defaultValue: '~/.ssh/id_rsa',
      });
      if (p.isCancel(keyPath)) return;
      const resolvedPath = (keyPath as string).replace('~', process.env.HOME || '');
      if (existsSync(resolvedPath)) {
        privateKey = readFileSync(resolvedPath, 'utf-8');
      } else {
        p.note(`File not found: ${resolvedPath}`, 'Error');
        return;
      }
    }

    const credentials = {
      host: host as string,
      port: 22,
      username: 'root',
      password: password || undefined,
      privateKey: privateKey || undefined,
    };

    const orchestrator = new ProvisionOrchestrator(credentials);
    const spinner = p.spinner();

    try {
      spinner.start('Connecting to remote VPS...');
      await orchestrator.connect();
      spinner.stop(pc.green('SSH connection established!'));

      spinner.start('Inspecting remote OS & hardware capabilities...');
      const sysInfo = await orchestrator.probe();
      spinner.stop(pc.green(`Detected ${sysInfo.os.name} (${sysInfo.arch}) with ${sysInfo.memory.totalMb}MB RAM`));

      const options: ProvisionOptions = {
        credentials,
        agent: { type: agentType, envVars },
        telegram: telegramConfig,
        onProgress: (step, status, details) => {
          if (status === 'in_progress') {
            spinner.start(`${step}: ${details || 'working...'}`);
          } else if (status === 'success') {
            spinner.stop(pc.green(`✔ ${step}: ${details || 'done'}`));
          }
        },
      };

      const result = await orchestrator.provision(options);
      orchestrator.disconnect();

      if (result.success) {
        p.note(
          `Agent: ${result.agent.type}\nHost: ${result.host}\nDuration: ${result.durationSeconds} seconds\nTelegram: ${result.telegramConnected ? 'Active' : 'Disabled'}\nService: systemd 'agentvps.service' running 24/7`,
          'Deployment Report'
        );
        p.outro(pc.green('🎉 Your 24/7 AI Agent is now live on your VPS!'));
      } else {
        p.note(result.error || 'Unknown error occurred during provisioning', 'Error');
      }
    } catch (err: any) {
      orchestrator.disconnect();
      spinner.stop(pc.red('Connection failed!'));
      p.note(err.message || String(err), 'Error');
    }
  }
}
