import { Client, ConnectConfig } from 'ssh2';
import { ServerCredentials } from '../types/index.js';

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface ExecOptions {
  timeoutMs?: number;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  env?: Record<string, string>;
}

export class SSHClient {
  private client: Client;
  private credentials: ServerCredentials;
  private connected: boolean = false;

  constructor(credentials: ServerCredentials) {
    this.client = new Client();
    this.credentials = credentials;
  }

  public async connect(timeoutMs: number = 20000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.client.end();
        reject(new Error(`SSH connection to ${this.credentials.host}:${this.credentials.port || 22} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const config: ConnectConfig = {
        host: this.credentials.host,
        port: this.credentials.port || 22,
        username: this.credentials.username || 'root',
        readyTimeout: timeoutMs,
      };

      if (this.credentials.privateKey) {
        config.privateKey = this.credentials.privateKey;
        if (this.credentials.passphrase) {
          config.passphrase = this.credentials.passphrase;
        }
      } else if (this.credentials.password) {
        config.password = this.credentials.password;
      } else {
        clearTimeout(timer);
        return reject(new Error('Either password or privateKey must be provided for SSH authentication'));
      }

      this.client
        .on('ready', () => {
          clearTimeout(timer);
          this.connected = true;
          resolve();
        })
        .on('error', (err) => {
          clearTimeout(timer);
          this.connected = false;
          reject(err);
        })
        .on('close', () => {
          this.connected = false;
        })
        .connect(config);
    });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async exec(command: string, options: ExecOptions = {}): Promise<ExecResult> {
    if (!this.connected) {
      throw new Error('SSH client is not connected. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      const timeoutMs = options.timeoutMs || 120000;
      let timer: NodeJS.Timeout | null = null;

      this.client.exec(command, { env: options.env }, (err, stream) => {
        if (err) return reject(err);

        let stdout = '';
        let stderr = '';

        timer = setTimeout(() => {
          stream.destroy();
          reject(new Error(`Command timed out after ${timeoutMs}ms: "${command.slice(0, 80)}..."`));
        }, timeoutMs);

        stream.on('close', (code: number) => {
          if (timer) clearTimeout(timer);
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            code: code ?? 0,
          });
        });

        stream.on('data', (data: Buffer) => {
          const chunk = data.toString('utf-8');
          stdout += chunk;
          if (options.onStdout) options.onStdout(chunk);
        });

        stream.stderr.on('data', (data: Buffer) => {
          const chunk = data.toString('utf-8');
          stderr += chunk;
          if (options.onStderr) options.onStderr(chunk);
        });
      });
    });
  }

  public async uploadString(content: string, remotePath: string, mode: number = 0o755): Promise<void> {
    if (!this.connected) {
      throw new Error('SSH client is not connected');
    }

    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) return reject(err);

        const writeStream = sftp.createWriteStream(remotePath, { mode });

        writeStream.on('close', () => {
          sftp.end();
          resolve();
        });

        writeStream.on('error', (writeErr: any) => {
          sftp.end();
          reject(writeErr);
        });

        writeStream.end(content, 'utf-8');
      });
    });
  }

  public disconnect(): void {
    if (this.connected) {
      this.client.end();
      this.connected = false;
    }
  }
}
