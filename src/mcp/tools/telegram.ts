import { z } from 'zod';
import { ProvisionOrchestrator } from '../../engine/orchestrator.js';

export const setupTelegramSchema = {
  host: z.string().describe('IP address or hostname of the remote VPS'),
  port: z.number().optional().default(22).describe('SSH port'),
  username: z.string().optional().default('root').describe('SSH username'),
  password: z.string().optional().describe('SSH password'),
  privateKey: z.string().optional().describe('SSH private key'),
  passphrase: z.string().optional().describe('Passphrase for private key'),
  botToken: z.string().describe('Telegram Bot Token from @BotFather'),
  adminChatId: z.string().describe('Telegram Admin Chat ID from @userinfobot'),
};

export async function handleSetupTelegram(args: z.infer<z.ZodObject<typeof setupTelegramSchema>>) {
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
    const ssh = (orchestrator as any).ssh;

    // Append or update TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID in /opt/agentvps/.env
    const updateCmd = `
      sed -i '/TELEGRAM_BOT_TOKEN/d' /opt/agentvps/.env
      sed -i '/TELEGRAM_ADMIN_CHAT_ID/d' /opt/agentvps/.env
      echo "TELEGRAM_BOT_TOKEN=${args.botToken}" >> /opt/agentvps/.env
      echo "TELEGRAM_ADMIN_CHAT_ID=${args.adminChatId}" >> /opt/agentvps/.env
      systemctl restart agentvps
    `;
    const res = await ssh.exec(updateCmd);
    orchestrator.disconnect();

    if (res.code !== 0) {
      throw new Error(`Failed to configure Telegram bridge: ${res.stderr || res.stdout}`);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `📱 Telegram 24/7 mobile gateway successfully configured on ${args.host}!\nSend \`/start\` or \`/status\` to your Telegram bot to test the connection.`,
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
          text: `Error setting up Telegram on ${args.host}: ${error.message || String(error)}`,
        },
      ],
    };
  }
}
