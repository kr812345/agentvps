import { describe, it, expect } from 'vitest';
import { RecipeEngine, SUPPORTED_RECIPES } from '../src/engine/recipes.js';
import { AgentConfig, ProvisionOptions } from '../src/types/index.js';

describe('RecipeEngine', () => {
  it('should support all standard agent recipes', () => {
    expect(SUPPORTED_RECIPES['antigravity-cli']).toBeDefined();
    expect(SUPPORTED_RECIPES['claude-code']).toBeDefined();
    expect(SUPPORTED_RECIPES['aider']).toBeDefined();
    expect(SUPPORTED_RECIPES['openhands']).toBeDefined();
    expect(SUPPORTED_RECIPES['custom']).toBeDefined();
  });

  it('should require GEMINI_API_KEY for antigravity-cli', () => {
    const recipe = RecipeEngine.getRecipe('antigravity-cli');
    expect(recipe.requiredEnvVars).toContain('GEMINI_API_KEY');
  });

  it('should require ANTHROPIC_API_KEY for claude-code', () => {
    const recipe = RecipeEngine.getRecipe('claude-code');
    expect(recipe.requiredEnvVars).toContain('ANTHROPIC_API_KEY');
  });

  describe('generateEnvFile', () => {
    it('should generate valid .env file content with all variables', () => {
      const config: AgentConfig = {
        type: 'antigravity-cli',
        workspacePath: '/custom/workspace',
        envVars: {
          GEMINI_API_KEY: 'test-gemini-key',
          ANTHROPIC_API_KEY: 'test-anthropic-key',
        },
        gitConfig: {
          name: 'Agent Tester',
          email: 'agent@test.com',
          githubToken: 'ghp_secret',
        },
      };

      const envContent = RecipeEngine.generateEnvFile(config);
      expect(envContent).toContain('AGENT_TYPE=antigravity-cli');
      expect(envContent).toContain('WORKSPACE_DIR=/custom/workspace');
      expect(envContent).toContain('GEMINI_API_KEY=test-gemini-key');
      expect(envContent).toContain('ANTHROPIC_API_KEY=test-anthropic-key');
      expect(envContent).toContain('GIT_AUTHOR_NAME="Agent Tester"');
      expect(envContent).toContain('GIT_AUTHOR_EMAIL="agent@test.com"');
      expect(envContent).toContain('GITHUB_TOKEN="ghp_secret"');
    });
  });

  describe('generateDockerCompose', () => {
    it('should generate valid compose content with limits and volume mounts', () => {
      const options: ProvisionOptions = {
        credentials: { host: '192.168.1.100' },
        agent: {
          type: 'claude-code',
          memoryLimitMb: 4096,
          cpuLimit: 3.5,
        },
        enableWebTerminal: true,
        webTerminalPort: 7681,
      };

      const compose = RecipeEngine.generateDockerCompose(options);
      expect(compose).toContain('agentvps_active_agent');
      expect(compose).toContain('image: agentvps-runtime:latest');
      expect(compose).toContain('/opt/agentvps/workspace:/workspace');
      expect(compose).toContain('memory: 4096m');
      expect(compose).toContain("cpus: '3.5'");
      expect(compose).toContain('127.0.0.1:7681:7681');
      expect(compose).toContain('command: claude');
    });
  });

  describe('generateSystemdService', () => {
    it('should generate valid systemd service unit file', () => {
      const service = RecipeEngine.generateSystemdService();
      expect(service).toContain('Description=AgentVPS 24/7 Autonomous AI Agent Service');
      expect(service).toContain('ExecStart=/usr/bin/docker compose -f /opt/agentvps/docker-compose.yml up');
      expect(service).toContain('Restart=always');
      expect(service).toContain('WantedBy=multi-user.target');
    });
  });
});
