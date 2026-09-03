import { z } from 'zod';
import { ProvisionOrchestrator } from '../../engine/orchestrator.js';
import { AgentConfig, AgentType } from '../../types/index.js';
import { RecipeEngine } from '../../engine/recipes.js';

export const deployAgentSchema = {
  host: z.string().describe('IP address or hostname of the remote VPS'),
  port: z.number().optional().default(22).describe('SSH port'),
  username: z.string().optional().default('root').describe('SSH username'),
  password: z.string().optional().describe('SSH password'),
  privateKey: z.string().optional().describe('SSH private key'),
  passphrase: z.string().optional().describe('Passphrase for private key'),
  agentType: z
    .enum(['antigravity-cli', 'claude-code', 'aider', 'openhands', 'custom'])
    .describe('New AI agent type to switch to'),
  geminiApiKey: z.string().optional().describe('Google Gemini API key'),
  anthropicApiKey: z.string().optional().describe('Anthropic Claude API key'),
  openaiApiKey: z.string().optional().describe('OpenAI API key'),
  githubToken: z.string().optional().describe('GitHub token'),
  customCommand: z.string().optional().describe('Custom launch command if agentType is custom'),
};

export async function handleDeployAgent(args: z.infer<z.ZodObject<typeof deployAgentSchema>>) {
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

    const envVars: Record<string, string> = {};
    if (args.geminiApiKey) envVars['GEMINI_API_KEY'] = args.geminiApiKey;
    if (args.anthropicApiKey) envVars['ANTHROPIC_API_KEY'] = args.anthropicApiKey;
    if (args.openaiApiKey) envVars['OPENAI_API_KEY'] = args.openaiApiKey;
    if (args.githubToken) envVars['GITHUB_TOKEN'] = args.githubToken;

    const agentConfig: AgentConfig = {
      type: args.agentType as AgentType,
      envVars,
      customCommand: args.customCommand,
    };

    const envContent = RecipeEngine.generateEnvFile(agentConfig);
    const ssh = (orchestrator as any).ssh;
    await ssh.uploadString(envContent, '/opt/agentvps/.env', 0o600);

    const composeContent = RecipeEngine.generateDockerCompose({
      credentials,
      agent: agentConfig,
    });
    await ssh.uploadString(composeContent, '/opt/agentvps/docker-compose.yml', 0o644);

    // Restart the systemd service to pick up the new compose config
    const restartRes = await ssh.exec('systemctl restart agentvps');
    if (restartRes.code !== 0) {
      throw new Error(`Failed to restart service: ${restartRes.stderr || restartRes.stdout}`);
    }

    orchestrator.disconnect();

    return {
      content: [
        {
          type: 'text' as const,
          text: `✔ Successfully switched active 24/7 agent on ${args.host} to ${args.agentType}!`,
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
          text: `Failed to deploy/switch agent on ${args.host}: ${error.message || String(error)}`,
        },
      ],
    };
  }
}
