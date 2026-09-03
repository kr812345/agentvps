import pc from 'picocolors';

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export class Logger {
  private debugMode: boolean;

  constructor(debugMode = false) {
    this.debugMode = debugMode || process.env.DEBUG === 'true';
  }

  info(message: string, ...args: any[]) {
    console.log(pc.blue('ℹ') + ' ' + message, ...args);
  }

  success(message: string, ...args: any[]) {
    console.log(pc.green('✔') + ' ' + pc.bold(message), ...args);
  }

  warn(message: string, ...args: any[]) {
    console.warn(pc.yellow('⚠') + ' ' + message, ...args);
  }

  error(message: string, ...args: any[]) {
    console.error(pc.red('✖') + ' ' + pc.bold(message), ...args);
  }

  debug(message: string, ...args: any[]) {
    if (this.debugMode) {
      console.log(pc.dim('🔍 [DEBUG] ' + message), ...args);
    }
  }

  step(stepIndex: number, totalSteps: number, name: string) {
    console.log(pc.cyan(`[${stepIndex}/${totalSteps}]`) + ' ' + pc.bold(name));
  }
}

export const defaultLogger = new Logger();
