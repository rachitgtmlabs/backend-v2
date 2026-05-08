import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'node:child_process';
import * as path from 'node:path';

/**
 * Runs `uv run python ocr_extraction.py --warmup` so docTR downloads weights
 * and loads db_resnet50 + parseq once at process start (same shell cache as later CLI runs).
 */
@Injectable()
export class OcrWarmupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OcrWarmupService.name);

  constructor(private readonly config: ConfigService) {}

  /** Resolve uv binary: prefer UV_PATH env var, then /usr/local/bin/uv */
  private resolveUvBin(): string {
    const fromEnv = this.config.get<string>('UV_PATH');
    if (fromEnv) return fromEnv;
    return '/usr/local/bin/uv';
  }
  async onApplicationBootstrap(): Promise<void> {
    const skip =
      this.config.get<string>('OCR_SKIP_WARMUP') === '1' ||
      this.config.get<string>('OCR_SKIP_WARMUP') === 'true';
    if (skip) {
      this.logger.log('Skipping docTR OCR warmup (OCR_SKIP_WARMUP is set)');
      return;
    }

    const root = process.cwd();
    const script = path.join(root, 'ocr_extraction.py');
    const uvBin = this.resolveUvBin();

    await new Promise<void>((resolve) => {
      const child = spawn(uvBin, ['run', 'python', script, '--warmup'], {
        cwd: root,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.stdout?.on('data', (chunk: Buffer) => {
        const line = chunk.toString().trim();
        if (line) this.logger.log(line);
      });

      const timeoutMs = 15 * 60 * 1000;
      const timer = setTimeout(() => {
        this.logger.warn('docTR warmup timed out; killing subprocess');
        child.kill('SIGTERM');
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          this.logger.log('docTR OCR warmup completed');
        } else {
          this.logger.warn(
            `docTR warmup exited with code ${code}. stderr: ${stderr.slice(-2000)}`,
          );
        }
        resolve();
      });

      child.on('error', (err: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        if (err.code === 'ENOENT') {
          this.logger.warn(
            `Could not run uv for OCR warmup (tried: ${uvBin}). Install uv or set OCR_SKIP_WARMUP=1. ` +
              err.message,
          );
        } else {
          this.logger.warn(`OCR warmup spawn error: ${err.message}`);
        }
        resolve();
      });
    });
  }
}
