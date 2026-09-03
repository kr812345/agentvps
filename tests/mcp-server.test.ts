import { describe, it, expect } from 'vitest';
import { createMcpServer } from '../src/mcp/server.js';
import { handleGenerateBootstrapCurl } from '../src/mcp/tools/curl.js';
import { handleDetectVps } from '../src/mcp/tools/detect.js';

describe('MCP Server', () => {
  it('should initialize McpServer instance successfully', () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
    expect((server as any).server).toBeDefined();
  });

  describe('handleGenerateBootstrapCurl', () => {
    it('should generate standard curl command for antigravity-cli', async () => {
      const result = await handleGenerateBootstrapCurl({
        agentType: 'antigravity-cli',
        publicUrl: 'https://get.agentvps.dev',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.command).toBe('curl -fsSL https://get.agentvps.dev/bootstrap.sh | bash -s -- --agent=antigravity-cli');
      expect(data.supportedDistros).toContain('Ubuntu (20.04, 22.04, 24.04)');
    });

    it('should embed API keys in curl arguments when provided', async () => {
      const result = await handleGenerateBootstrapCurl({
        agentType: 'claude-code',
        publicUrl: 'https://custom.domain.io',
        anthropicApiKey: 'sk-ant-test-123',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.command).toContain('--agent=claude-code');
      expect(data.command).toContain('--anthropic-key=sk-ant-test-123');
    });
  });

  describe('handleDetectVps error handling', () => {
    it('should return graceful error content when target VPS is unreachable', async () => {
      const result = await handleDetectVps({
        host: '192.0.2.1', // RFC 5737 TEST-NET-1 (unreachable)
        port: 22,
        username: 'root',
        password: 'fake-password',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to inspect VPS at 192.0.2.1');
    }, 25000);
  });

  describe('handleCreateCloudVps error handling', () => {
    it('should return error when API token is invalid or rejected', async () => {
      const { vi } = await import('vitest');
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized: Invalid API token',
      } as any);

      const { handleCreateCloudVps } = await import('../src/mcp/tools/cloud.js');
      const result = await handleCreateCloudVps({
        provider: 'hetzner',
        apiToken: 'invalid_token_test',
        agentType: 'antigravity-cli',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to create cloud VPS on hetzner');
      expect(result.content[0].text).toContain('Unauthorized');

      fetchSpy.mockRestore();
    });
  });
});
