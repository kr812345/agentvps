import { z } from 'zod';
import { SSHClient } from '../../engine/ssh.js';
import { OSDetector } from '../../engine/os-detector.js';

export const detectVpsSchema = {
  host: z.string().describe('IP address or domain of the remote VPS'),
  port: z.number().optional().default(22).describe('SSH port (default: 22)'),
  username: z.string().optional().default('root').describe('SSH username (default: root)'),
  password: z.string().optional().describe('SSH password'),
  privateKey: z.string().optional().describe('SSH private key (PEM or OpenSSH format)'),
  passphrase: z.string().optional().describe('Passphrase for the private key if encrypted'),
};

export async function handleDetectVps(args: z.infer<z.ZodObject<typeof detectVpsSchema>>) {
  const ssh = new SSHClient({
    host: args.host,
    port: args.port,
    username: args.username,
    password: args.password,
    privateKey: args.privateKey,
    passphrase: args.passphrase,
  });

  try {
    await ssh.connect(15000);
    const systemInfo = await OSDetector.probeRemoteSystem(ssh);
    ssh.disconnect();

    const report = {
      host: args.host,
      status: 'reachable',
      os: {
        name: systemInfo.os.name,
        distribution: systemInfo.os.id,
        version: systemInfo.os.version,
        family: systemInfo.os.family,
        packageManager: systemInfo.os.packageManager,
      },
      hardware: {
        architecture: systemInfo.arch,
        cpuCores: systemInfo.cpu.cores,
        cpuModel: systemInfo.cpu.model,
        totalMemoryMb: systemInfo.memory.totalMb,
        freeMemoryMb: systemInfo.memory.freeMb,
        diskTotalGb: systemInfo.disk.totalGb,
        diskFreeGb: systemInfo.disk.freeGb,
      },
      services: {
        dockerInstalled: systemInfo.docker.installed,
        dockerRunning: systemInfo.docker.running,
        dockerVersion: systemInfo.docker.version || 'Not installed',
        firewallActive: systemInfo.firewall.active,
        firewallType: systemInfo.firewall.type,
      },
      readyForAgent: systemInfo.memory.totalMb >= 1800 && systemInfo.disk.freeGb >= 5,
      recommendations: [] as string[],
    };

    if (systemInfo.memory.totalMb < 2000) {
      report.recommendations.push(
        'Server has under 2GB RAM. Consider enabling swap (e.g. 2GB swapfile) for large builds.'
      );
    }
    if (!systemInfo.docker.installed) {
      report.recommendations.push(
        'Docker is not currently installed. The AgentVPS provisioner will install it automatically.'
      );
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  } catch (error: any) {
    ssh.disconnect();
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Failed to inspect VPS at ${args.host}: ${error.message || String(error)}`,
        },
      ],
    };
  }
}
