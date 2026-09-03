import { describe, it, expect } from 'vitest';
import { OSDetector } from '../src/engine/os-detector.js';

describe('OSDetector', () => {
  describe('parseOsRelease', () => {
    it('should correctly identify Ubuntu 24.04', () => {
      const mockOsRelease = `
NAME="Ubuntu"
VERSION="24.04 LTS (Noble Numbat)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 24.04 LTS"
VERSION_ID="24.04"
HOME_URL="https://www.ubuntu.com/"
`;
      const result = OSDetector.parseOsRelease(mockOsRelease);
      expect(result.id).toBe('ubuntu');
      expect(result.family).toBe('debian');
      expect(result.packageManager).toBe('apt');
      expect(result.version).toBe('24.04');
    });

    it('should correctly identify Debian 12 Bookworm', () => {
      const mockOsRelease = `
PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"
NAME="Debian GNU/Linux"
VERSION_ID="12"
VERSION="12 (bookworm)"
ID=debian
HOME_URL="https://www.debian.org/"
`;
      const result = OSDetector.parseOsRelease(mockOsRelease);
      expect(result.id).toBe('debian');
      expect(result.family).toBe('debian');
      expect(result.packageManager).toBe('apt');
      expect(result.version).toBe('12');
    });

    it('should correctly identify Fedora 40', () => {
      const mockOsRelease = `
NAME="Fedora Linux"
VERSION="40 (Cloud Edition)"
ID=fedora
VERSION_ID=40
PRETTY_NAME="Fedora Linux 40 (Cloud Edition)"
CPE_NAME="cpe:/o:fedoraproject:fedora:40"
`;
      const result = OSDetector.parseOsRelease(mockOsRelease);
      expect(result.id).toBe('fedora');
      expect(result.family).toBe('rhel');
      expect(result.packageManager).toBe('dnf');
      expect(result.version).toBe('40');
    });

    it('should correctly identify Rocky Linux 9', () => {
      const mockOsRelease = `
NAME="Rocky Linux"
VERSION="9.4 (Blue Onyx)"
ID="rocky"
ID_LIKE="rhel centos fedora"
VERSION_ID="9.4"
PLATFORM_ID="platform:el9"
PRETTY_NAME="Rocky Linux 9.4 (Blue Onyx)"
`;
      const result = OSDetector.parseOsRelease(mockOsRelease);
      expect(result.id).toBe('rocky');
      expect(result.family).toBe('rhel');
      expect(result.packageManager).toBe('dnf');
      expect(result.version).toBe('9.4');
    });

    it('should correctly identify Arch Linux', () => {
      const mockOsRelease = `
NAME="Arch Linux"
PRETTY_NAME="Arch Linux"
ID=arch
BUILD_ID=rolling
`;
      const result = OSDetector.parseOsRelease(mockOsRelease);
      expect(result.id).toBe('arch');
      expect(result.family).toBe('arch');
      expect(result.packageManager).toBe('pacman');
    });

    it('should correctly identify Alpine Linux', () => {
      const mockOsRelease = `
NAME="Alpine Linux"
ID=alpine
VERSION_ID=3.19.1
PRETTY_NAME="Alpine Linux v3.19"
HOME_URL="https://alpinelinux.org/"
`;
      const result = OSDetector.parseOsRelease(mockOsRelease);
      expect(result.id).toBe('alpine');
      expect(result.family).toBe('alpine');
      expect(result.packageManager).toBe('apk');
      expect(result.version).toBe('3.19.1');
    });

    it('should correctly identify openSUSE', () => {
      const mockOsRelease = `
NAME="openSUSE Tumbleweed"
ID="opensuse-tumbleweed"
ID_LIKE="opensuse suse"
VERSION_ID="20240501"
PRETTY_NAME="openSUSE Tumbleweed"
`;
      const result = OSDetector.parseOsRelease(mockOsRelease);
      expect(result.family).toBe('suse');
      expect(result.packageManager).toBe('zypper');
    });
  });

  describe('parseArch', () => {
    it('should map x86_64 and amd64 to x86_64', () => {
      expect(OSDetector.parseArch('x86_64')).toBe('x86_64');
      expect(OSDetector.parseArch('amd64')).toBe('x86_64');
    });

    it('should map aarch64 and arm64 to aarch64', () => {
      expect(OSDetector.parseArch('aarch64')).toBe('aarch64');
      expect(OSDetector.parseArch('arm64')).toBe('aarch64');
    });

    it('should map armv7l', () => {
      expect(OSDetector.parseArch('armv7l')).toBe('armv7l');
    });

    it('should return unknown for unrecognized arch', () => {
      expect(OSDetector.parseArch('mips64')).toBe('unknown');
    });
  });

  describe('parseMemory', () => {
    it('should parse free -m output properly', () => {
      const mockFree = `
               total        used        free      shared  buff/cache   available
Mem:            3912        1250        1850          12         812        2450
Swap:           2047           0        2047
`;
      const mem = OSDetector.parseMemory(mockFree);
      expect(mem.totalMb).toBe(3912);
      expect(mem.usedMb).toBe(1250);
      expect(mem.freeMb).toBe(1850);
    });
  });

  describe('parseDisk', () => {
    it('should parse df -m output properly', () => {
      const mockDf = `
Filesystem     1M-blocks  Used Available Use% Mounted on
/dev/root          40960 10240     30720  25% /
`;
      const disk = OSDetector.parseDisk(mockDf);
      expect(disk.totalGb).toBe(40);
      expect(disk.usedGb).toBe(10);
      expect(disk.freeGb).toBe(30);
      expect(disk.mount).toBe('/');
    });
  });
});
