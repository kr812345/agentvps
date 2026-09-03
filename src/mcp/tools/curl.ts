import { z } from 'zod';

export const generateBootstrapCurlSchema = {
  agentType: z
    .enum(['antigravity-cli', 'claude-code', 'aider', 'openhands'])
    .optional()
    .default('antigravity-cli')
    .describe('Pre-selected AI agent'),
  publicUrl: z
    .string()
    .optional()
    .default('https://get.agentvps.dev')
    .describe('Base URL where bootstrap scripts are hosted'),
  geminiApiKey: z.string().optional().describe('Optional Gemini API Key to embed in launch command'),
  anthropicApiKey: z.string().optional().describe('Optional Anthropic API Key to embed in launch command'),
};

export async function handleGenerateBootstrapCurl(args: z.infer<z.ZodObject<typeof generateBootstrapCurlSchema>>) {
  const params: string[] = [`--agent=${args.agentType}`];
  if (args.geminiApiKey) params.push(`--gemini-key=${args.geminiApiKey}`);
  if (args.anthropicApiKey) params.push(`--anthropic-key=${args.anthropicApiKey}`);

  const curlCommand = `curl -fsSL ${args.publicUrl}/bootstrap.sh | bash -s -- ${params.join(' ')}`;

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            description: 'Run this single command on your remote VPS as root to automatically provision your 24/7 AI agent:',
            command: curlCommand,
            supportedDistros: [
              'Ubuntu (20.04, 22.04, 24.04)',
              'Debian (11, 12)',
              'Fedora (38, 39, 40)',
              'Rocky Linux & AlmaLinux (8, 9)',
              'Arch Linux & Manjaro',
              'Alpine Linux (3.18+)',
            ],
            features: [
              'Zero external dependencies required before running',
              'Automatic Docker Engine installation & hardening',
              'Standardized multi-agent sandbox container',
              'Persistent systemd service with crash watchdog',
            ],
          },
          null,
          2
        ),
      },
    ],
  };
}
