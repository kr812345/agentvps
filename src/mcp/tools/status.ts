import { z } from 'zod';
import { ProvisionOrchestrator } from '../../engine/orchestrator.js';

export const checkAgentStatusSchema = {
  host: z.string().describe('IP address or hostname of the remote VPS'),
  port: z.number().optional().default(22).describe('SSH port'),
  username: z.string().optional().default('root').describe('SSH username'),
  password: z.string().optional().describe('SSH password'),
  privateKey: z.string().optional().describe('SSH private key'),
  passphrase: z.string().optional().describe('Passphrase for private key'),
};

export async function handleCheckAgentStatus(args: z.infer<z.ZodObject<typeof checkAgentStatusSchema>>) {
  const credentials = {
    host: args.host,
    port: args.port,
    username: args.username,
    password: args.password,
    privateKey: args.privateKey,
    passphrase: args.passphrase,
  };

  const orchestrator = new ProvisionOrchestrator(credentials);

  try {
    await orchestrator.connect();
    const status = await orchestrator.getStatus();
    orchestrator.disconnect();

    const report = {
      host: status.host,
      health: status.containerRunning && status.agentProcessRunning ? 'HEALTHY 🟢' : 'DEGRADED / OFFLINE 🔴',
      containerRunning: status.containerRunning,
      agentSessionActive: status.agentProcessRunning,
      activeAgentType: status.agentType,
      resources: {
        cpuUsagePercent: `${status.cpuPercent}%`,
        memoryUsageMb: `${status.memoryUsageMb} MB`,
      },
      recentLogs: status.recentLogs.slice(-15),
      lastChecked: status.lastActive,
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  } catch (error: any) {
    orchestrator.disconnect();
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Failed to check status on ${args.host}: ${error.message || String(error)}`,
        },
      ],
    };
  }
}
