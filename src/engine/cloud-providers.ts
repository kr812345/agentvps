import { AgentConfig, ProvisionOptions } from '../types/index.js';
import { RecipeEngine } from './recipes.js';

export type CloudProviderType = 'hetzner' | 'digitalocean';

export interface CloudServerOptions {
  provider: CloudProviderType;
  apiToken: string;
  name?: string;
  region?: string;
  serverType?: string;
  agent: AgentConfig;
  telegram?: {
    enabled: boolean;
    botToken: string;
    adminChatId: string;
  };
}

export interface CloudServerResult {
  success: boolean;
  provider: CloudProviderType;
  serverId: string;
  serverName: string;
  publicIp: string;
  region: string;
  agent: string;
  status: string;
  telegramConnected: boolean;
  error?: string;
}

export class CloudProviderEngine {
  /**
   * Generate cloud-init user_data script that self-provisions on first boot
   */
  public static generateCloudInit(options: CloudServerOptions): string {
    const envVars: Record<string, string> = {
      AGENT_TYPE: options.agent.type,
      ...(options.agent.envVars || {}),
    };

    if (options.telegram && options.telegram.enabled) {
      envVars['TELEGRAM_BOT_TOKEN'] = options.telegram.botToken;
      envVars['TELEGRAM_ADMIN_CHAT_ID'] = options.telegram.adminChatId;
    }

    const envLines = Object.entries(envVars)
      .map(([k, v]) => `echo "${k}=${v}" >> /opt/agentvps/.env`)
      .join('\n');

    return `#cloud-config
write_files:
  - path: /opt/agentvps/runtime-init.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      set -e
      mkdir -p /opt/agentvps/workspace /opt/agentvps/config /opt/agentvps/runtime
      ${envLines}
      # Download and execute universal bootstrap
      curl -fsSL https://get.agentvps.dev/bootstrap.sh -o /tmp/bootstrap.sh || true
      chmod +x /tmp/bootstrap.sh || true
      /tmp/bootstrap.sh || true
      # Run Docker agent
      docker run -d --name agentvps_active_agent --restart unless-stopped \
        --env-file /opt/agentvps/.env \
        -v /opt/agentvps/workspace:/workspace \
        node:22-bookworm-slim bash -c "while true; do sleep 3600; done" || true

runcmd:
  - /opt/agentvps/runtime-init.sh
`;
  }

  /**
   * Provision a server on Hetzner Cloud
   */
  public static async provisionHetzner(
    options: CloudServerOptions,
    fetchFn = fetch
  ): Promise<CloudServerResult> {
    const name = options.name || `agentvps-${Date.now().toString().slice(-4)}`;
    const serverType = options.serverType || 'cx22'; // 2 vCPU, 4GB RAM, ~€3.79/mo
    const location = options.region || 'fsn1'; // Falkenstein, Germany or hel1, nbg1, ash
    const userData = this.generateCloudInit(options);

    const res = await fetchFn('https://api.hetzner.cloud/v1/servers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        server_type: serverType,
        image: 'ubuntu-24.04',
        location,
        start_after_create: true,
        user_data: userData,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Hetzner Cloud API Error (${res.status}): ${errBody}`);
    }

    const data = (await res.json()) as any;
    const serverId = String(data.server?.id);
    const publicIp = data.server?.public_net?.ipv4?.ip || 'Pending IP assignment';

    return {
      success: true,
      provider: 'hetzner',
      serverId,
      serverName: name,
      publicIp,
      region: location,
      agent: options.agent.type,
      status: data.server?.status || 'initializing',
      telegramConnected: Boolean(options.telegram?.enabled),
    };
  }

  /**
   * Provision a droplet on DigitalOcean
   */
  public static async provisionDigitalOcean(
    options: CloudServerOptions,
    fetchFn = fetch
  ): Promise<CloudServerResult> {
    const name = options.name || `agentvps-${Date.now().toString().slice(-4)}`;
    const size = options.serverType || 's-1vcpu-2gb'; // $12/mo or s-2vcpu-4gb
    const region = options.region || 'nyc3';
    const userData = this.generateCloudInit(options);

    const res = await fetchFn('https://api.digitalocean.com/v2/droplets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        region,
        size,
        image: 'ubuntu-24-04-x64',
        user_data: userData,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`DigitalOcean API Error (${res.status}): ${errBody}`);
    }

    const data = (await res.json()) as any;
    const dropletId = String(data.droplet?.id);
    let publicIp = 'Pending IP assignment';

    const v4 = data.droplet?.networks?.v4;
    if (v4 && v4.length > 0) {
      publicIp = v4[0].ip_address;
    }

    return {
      success: true,
      provider: 'digitalocean',
      serverId: dropletId,
      serverName: name,
      publicIp,
      region,
      agent: options.agent.type,
      status: data.droplet?.status || 'new',
      telegramConnected: Boolean(options.telegram?.enabled),
    };
  }

  /**
   * Unified dispatcher for any supported cloud provider
   */
  public static async provision(options: CloudServerOptions, fetchFn = fetch): Promise<CloudServerResult> {
    if (options.provider === 'hetzner') {
      return this.provisionHetzner(options, fetchFn);
    } else if (options.provider === 'digitalocean') {
      return this.provisionDigitalOcean(options, fetchFn);
    } else {
      throw new Error(`Unsupported cloud provider: ${options.provider}. Supported: 'hetzner', 'digitalocean'`);
    }
  }
}
