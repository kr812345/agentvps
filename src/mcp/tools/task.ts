import { z } from 'zod';
import { ProvisionOrchestrator } from '../../engine/orchestrator.js';

export const executeAgentTaskSchema = {
  host: z.string().describe('IP address or hostname of the remote VPS'),
  port: z.number().optional().default(22).describe('SSH port'),
  username: z.string().optional().default('root').describe('SSH username'),
  password: z.string().optional().describe('SSH password'),
  privateKey: z.string().optional().describe('SSH private key'),
  passphrase: z.string().optional().describe('Passphrase for private key'),
  prompt: z.string().describe('Task instruction or prompt to dispatch to the remote agent'),
};

export async function handleExecuteAgentTask(args: z.infer<z.ZodObject<typeof executeAgentTaskSchema>>) {
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
    const result = await orchestrator.executeTask(args.prompt);
    orchestrator.disconnect();

    if (!result.success) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Failed to dispatch task to agent: ${result.output}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `🚀 Task successfully dispatched to 24/7 remote agent!\nPrompt: "${args.prompt}"\nThe agent is currently executing this in the remote workspace.`,
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
          text: `Error dispatching task to ${args.host}: ${error.message || String(error)}`,
        },
      ],
    };
  }
}
