import { describe, it, expect, vi } from 'vitest';
import { CloudProviderEngine, CloudServerOptions } from '../src/engine/cloud-providers.js';

describe('CloudProviderEngine', () => {
  describe('generateCloudInit', () => {
    it('should generate valid cloud-init user_data with environment variables', () => {
      const options: CloudServerOptions = {
        provider: 'hetzner',
        apiToken: 'fake-token',
        agent: {
          type: 'antigravity-cli',
          envVars: {
            GEMINI_API_KEY: 'test-gemini-key',
          },
        },
        telegram: {
          enabled: true,
          botToken: '123456:ABC',
          adminChatId: '987654',
        },
      };

      const cloudInit = CloudProviderEngine.generateCloudInit(options);
      expect(cloudInit).toContain('#cloud-config');
      expect(cloudInit).toContain('AGENT_TYPE=antigravity-cli');
      expect(cloudInit).toContain('GEMINI_API_KEY=test-gemini-key');
      expect(cloudInit).toContain('TELEGRAM_BOT_TOKEN=123456:ABC');
      expect(cloudInit).toContain('TELEGRAM_ADMIN_CHAT_ID=987654');
      expect(cloudInit).toContain('/tmp/bootstrap.sh');
    });
  });

  describe('provisionHetzner', () => {
    it('should call Hetzner API with correct payload and return server info', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          server: {
            id: 1234567,
            name: 'agentvps-test',
            status: 'initializing',
            public_net: {
              ipv4: { ip: '194.23.45.67' },
            },
          },
        }),
      });

      const options: CloudServerOptions = {
        provider: 'hetzner',
        apiToken: 'hcloud-fake-token',
        name: 'agentvps-test',
        region: 'fsn1',
        agent: {
          type: 'claude-code',
          envVars: { ANTHROPIC_API_KEY: 'sk-ant-test' },
        },
      };

      const result = await CloudProviderEngine.provisionHetzner(options, mockFetch as any);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hetzner.cloud/v1/servers',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer hcloud-fake-token',
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('hetzner');
      expect(result.serverId).toBe('1234567');
      expect(result.publicIp).toBe('194.23.45.67');
      expect(result.agent).toBe('claude-code');
    });
  });

  describe('provisionDigitalOcean', () => {
    it('should call DigitalOcean API with correct payload and return droplet info', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          droplet: {
            id: 98765432,
            name: 'agentvps-do',
            status: 'new',
            networks: {
              v4: [{ ip_address: '159.65.120.45' }],
            },
          },
        }),
      });

      const options: CloudServerOptions = {
        provider: 'digitalocean',
        apiToken: 'do-fake-token',
        name: 'agentvps-do',
        region: 'nyc3',
        agent: {
          type: 'aider',
          envVars: { OPENAI_API_KEY: 'sk-test' },
        },
      };

      const result = await CloudProviderEngine.provisionDigitalOcean(options, mockFetch as any);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.digitalocean.com/v2/droplets',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer do-fake-token',
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('digitalocean');
      expect(result.serverId).toBe('98765432');
      expect(result.publicIp).toBe('159.65.120.45');
      expect(result.agent).toBe('aider');
    });
  });
});
