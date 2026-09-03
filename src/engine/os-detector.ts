import { SSHClient } from './ssh.js';
import { SystemInfo, SupportedDistroFamily, SupportedArch } from '../types/index.js';

export class OSDetector {
  /**
   * Parse /etc/os-release content into structured OS information
   */
  public static parseOsRelease(content: string): {
    id: string;
    name: string;
    version: string;
    family: SupportedDistroFamily;
    packageManager: 'apt' | 'dnf' | 'yum' | 'pacman' | 'apk' | 'zypper' | 'unknown';
  } {
    const lines = content.split('\n');
    const fields: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        fields[key] = val;
      }
    }

    const id = (fields['ID'] || 'unknown').toLowerCase();
    const idLike = (fields['ID_LIKE'] || '').toLowerCase();
    const name = fields['PRETTY_NAME'] || fields['NAME'] || id;
    const version = fields['VERSION_ID'] || fields['VERSION'] || 'unknown';

    let family: SupportedDistroFamily = 'unknown';
    let packageManager: 'apt' | 'dnf' | 'yum' | 'pacman' | 'apk' | 'zypper' | 'unknown' = 'unknown';

    if (id === 'ubuntu' || id === 'debian' || idLike.includes('debian') || idLike.includes('ubuntu')) {
      family = 'debian';
      packageManager = 'apt';
    } else if (
      id === 'fedora' ||
      id === 'rhel' ||
      id === 'centos' ||
      id === 'rocky' ||
      id === 'alma' ||
      id === 'amzn' ||
      idLike.includes('rhel') ||
      idLike.includes('fedora') ||
      idLike.includes('centos')
    ) {
      family = 'rhel';
      packageManager = id === 'fedora' || id === 'rocky' || id === 'alma' ? 'dnf' : 'dnf';
    } else if (id === 'arch' || idLike.includes('arch') || id === 'manjaro') {
      family = 'arch';
      packageManager = 'pacman';
    } else if (id === 'alpine') {
      family = 'alpine';
      packageManager = 'apk';
    } else if (id.includes('suse') || idLike.includes('suse')) {
      family = 'suse';
      packageManager = 'zypper';
    }

    return { id, name, version, family, packageManager };
  }

  /**
   * Parse architecture string (uname -m)
   */
  public static parseArch(archStr: string): SupportedArch {
    const clean = archStr.trim().toLowerCase();
    if (clean === 'x86_64' || clean === 'amd64') return 'x86_64';
    if (clean === 'aarch64' || clean === 'arm64') return 'aarch64';
    if (clean.startsWith('armv7')) return 'armv7l';
    return 'unknown';
  }

  /**
   * Parse free -m output
   */
  public static parseMemory(freeOutput: string): { totalMb: number; freeMb: number; usedMb: number } {
    const lines = freeOutput.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts[0].toLowerCase().startsWith('mem')) {
        const totalMb = parseInt(parts[1], 10) || 0;
        const usedMb = parseInt(parts[2], 10) || 0;
        const freeMb = parseInt(parts[3], 10) || 0;
        return { totalMb, usedMb, freeMb };
      }
    }
    return { totalMb: 0, usedMb: 0, freeMb: 0 };
  }

  /**
   * Parse df -m / output
   */
  public static parseDisk(dfOutput: string): { totalGb: number; freeGb: number; usedGb: number; mount: string } {
    const lines = dfOutput.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[lines.length - 1].trim().split(/\s+/);
      // Filesystem 1M-blocks Used Available Use% Mounted on
      if (parts.length >= 6) {
        const totalMb = parseInt(parts[1], 10) || 0;
        const usedMb = parseInt(parts[2], 10) || 0;
        const freeMb = parseInt(parts[3], 10) || 0;
        const mount = parts[5] || '/';
        return {
          totalGb: parseFloat((totalMb / 1024).toFixed(1)),
          usedGb: parseFloat((usedMb / 1024).toFixed(1)),
          freeGb: parseFloat((freeMb / 1024).toFixed(1)),
          mount,
        };
      }
    }
    return { totalGb: 0, usedGb: 0, freeGb: 0, mount: '/' };
  }

  /**
   * Inspect remote VPS and gather full system information
   */
  public static async probeRemoteSystem(ssh: SSHClient): Promise<SystemInfo> {
    // 1. OS Release
    let osContent = '';
    try {
      const osRes = await ssh.exec('cat /etc/os-release 2>/dev/null || cat /usr/lib/os-release 2>/dev/null');
      osContent = osRes.stdout;
    } catch {
      osContent = 'ID=unknown';
    }
    const os = this.parseOsRelease(osContent);

    // 2. Arch
    let archStr = 'unknown';
    try {
      const archRes = await ssh.exec('uname -m');
      archStr = archRes.stdout;
    } catch {
      // fallback
    }
    const arch = this.parseArch(archStr);

    // 3. Memory
    let memOutput = '';
    try {
      const memRes = await ssh.exec('free -m 2>/dev/null || cat /proc/meminfo');
      memOutput = memRes.stdout;
    } catch {
      // fallback
    }
    const memory = this.parseMemory(memOutput);

    // 4. Disk
    let diskOutput = '';
    try {
      const diskRes = await ssh.exec('df -m / 2>/dev/null');
      diskOutput = diskRes.stdout;
    } catch {
      // fallback
    }
    const disk = this.parseDisk(diskOutput);

    // 5. CPU
    let cpuCores = 1;
    let cpuModel = 'Generic CPU';
    try {
      const nprocRes = await ssh.exec('nproc 2>/dev/null');
      cpuCores = parseInt(nprocRes.stdout, 10) || 1;
      const modelRes = await ssh.exec("grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs 2>/dev/null");
      if (modelRes.stdout) cpuModel = modelRes.stdout;
    } catch {
      // fallback
    }

    // 6. Docker Check
    let dockerInstalled = false;
    let dockerRunning = false;
    let dockerVersion: string | undefined = undefined;
    try {
      const dVer = await ssh.exec('docker --version 2>/dev/null');
      if (dVer.code === 0 && dVer.stdout) {
        dockerInstalled = true;
        dockerVersion = dVer.stdout;
        const dInfo = await ssh.exec('docker info >/dev/null 2>&1');
        dockerRunning = dInfo.code === 0;
      }
    } catch {
      // docker not installed
    }

    // 7. Firewall Check
    let firewallActive = false;
    let firewallType: 'ufw' | 'firewalld' | 'iptables' | 'none' = 'none';
    try {
      const ufwRes = await ssh.exec('which ufw >/dev/null 2>&1 && ufw status 2>/dev/null');
      if (ufwRes.code === 0 && ufwRes.stdout.includes('Status: active')) {
        firewallActive = true;
        firewallType = 'ufw';
      } else {
        const fwdRes = await ssh.exec('systemctl is-active firewalld 2>/dev/null');
        if (fwdRes.stdout === 'active') {
          firewallActive = true;
          firewallType = 'firewalld';
        }
      }
    } catch {
      // fallback
    }

    // 8. Tailscale Check
    let tailscaleInstalled = false;
    let tailscaleRunning = false;
    try {
      const tsRes = await ssh.exec('which tailscale >/dev/null 2>&1 && tailscale status 2>/dev/null');
      if (tsRes.code === 0) {
        tailscaleInstalled = true;
        tailscaleRunning = !tsRes.stdout.includes('Tailscale is stopped');
      }
    } catch {
      // fallback
    }

    return {
      os,
      arch,
      memory,
      disk,
      cpu: { cores: cpuCores, model: cpuModel },
      docker: { installed: dockerInstalled, version: dockerVersion, running: dockerRunning },
      firewall: { active: firewallActive, type: firewallType },
      tailscale: { installed: tailscaleInstalled, running: tailscaleRunning },
    };
  }
}
