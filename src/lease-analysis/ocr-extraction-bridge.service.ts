import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, type ChildProcess } from 'node:child_process';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export interface OcrExtractionJson {
  full_text: string;
  pages?: Array<{ page_number: number; text: string }>;
  source_pdf?: string;
  det_arch?: string;
  reco_arch?: string;
  exported?: unknown;
}

/**
 * Runs ocr_extraction.py (Google Document AI) via `uv run` or a direct venv Python binary.
 *
 * Two modes controlled by the UV_PATH env var:
 *   - UV_PATH unset / points to `uv` binary → spawn: uv run python ocr_extraction.py
 *   - UV_PATH points to a Python binary (contains "python") → spawn: /path/to/python ocr_extraction.py
 *     Use this on Cloud Run to avoid ADC credential issues with uv subprocess isolation.
 *     Set UV_PATH=/app/.venv/bin/python to use the pre-built venv directly.
 */
@Injectable()
export class OcrExtractionBridgeService implements OnModuleInit {
  private readonly logger = new Logger(OcrExtractionBridgeService.name);

  private readonly projectRoot = process.cwd();
  private readonly scriptPath = path.join(this.projectRoot, 'ocr_extraction.py');

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const { bin, args } = this.resolveSpawnConfig(['--version']);
    const child = spawn(bin, args, {
      cwd: this.projectRoot,
      env: { ...process.env },
      stdio: 'ignore',
    });
    child.on('error', () => {});
    child.on('close', (code) => {
      if (code === 0) {
        this.logger.log(`OCR environment pre-warmed successfully (bin: ${bin}).`);
      }
    });
  }

  private ocrSubprocessTimeoutMs(): number {
    const raw = this.config.get<string>('OCR_SUBPROCESS_TIMEOUT_MS');
    const n = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
    return 900_000;
  }

  /**
   * Resolve how to spawn the Python script.
   *
   * If UV_PATH contains "python" it is treated as a direct Python binary —
   * the script and extra args are passed directly to it.
   * Otherwise UV_PATH (or the discovered uv binary) is used with `uv run python`.
   */
  private resolveSpawnConfig(extraArgs: string[]): { bin: string; args: string[] } {
    const fromEnv = this.config.get<string>('UV_PATH');

    if (fromEnv && fromEnv.includes('python')) {
      // Direct venv Python mode — no 'uv run python' wrapper
      return { bin: fromEnv, args: extraArgs };
    }

    // uv mode
    let uvBin: string;
    if (fromEnv) {
      uvBin = fromEnv;
    } else {
      const candidates = ['/opt/homebrew/bin/uv', '/usr/local/bin/uv'];
      uvBin = candidates.find((c) => fsSync.existsSync(c)) ?? 'uv';
    }
    return { bin: uvBin, args: ['run', 'python', ...extraArgs] };
  }

  /**
   * Writes PDF bytes to a temp file and runs OCR. Cleans up the temp directory.
   */
  async extractTextFromPdfBuffer(buffer: Buffer): Promise<OcrExtractionJson> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lease-ocr-'));
    const pdfPath = path.join(tmpDir, 'upload.pdf');
    await fs.writeFile(pdfPath, buffer);

    try {
      const stdout = await this.runPythonScript([pdfPath]);
      return JSON.parse(stdout) as OcrExtractionJson;
    } catch (err) {
      if (err instanceof SyntaxError) {
        this.logger.error('OCR stdout was not valid JSON');
      }
      throw err;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /** Run OCR on an existing PDF path (caller owns the file lifecycle). */
  async extractTextFromPdfPath(pdfPath: string): Promise<OcrExtractionJson> {
    const stdout = await this.runPythonScript([pdfPath]);
    try {
      return JSON.parse(stdout) as OcrExtractionJson;
    } catch {
      this.logger.error(`OCR stdout was not JSON. First 500 chars: ${stdout.slice(0, 500)}`);
      throw new Error('OCR script returned invalid JSON');
    }
  }

  private runPythonScript(args: string[]): Promise<string> {
    const timeoutMs = this.ocrSubprocessTimeoutMs();
    const startedAt = Date.now();
    const { bin, args: spawnArgs } = this.resolveSpawnConfig([this.scriptPath, ...args]);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];

      this.logger.log(
        `PDF text subprocess starting (${bin} ${spawnArgs[0]} …); timeoutMs=${timeoutMs}.`,
      );

      const child: ChildProcess = spawn(bin, spawnArgs, {
        cwd: this.projectRoot,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const killTimer = setTimeout(() => {
        this.logger.error(
          `OCR subprocess exceeded timeout ${timeoutMs}ms — sending SIGKILL to pid=${child.pid}`,
        );
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stderr?.on('data', (d: Buffer) => {
        errChunks.push(d);
        const line = d.toString('utf8').trim();
        if (line) {
          this.logger.log(`[ocr_extraction stderr] ${line}`);
        }
      });

      const stdoutStream = child.stdout;
      if (!stdoutStream) {
        clearTimeout(killTimer);
        reject(new Error('OCR subprocess stdout is not piped'));
        return;
      }
      stdoutStream.on('data', (d: Buffer) => chunks.push(d));

      child.on('error', (err) => {
        clearTimeout(killTimer);
        reject(
          new Error(
            `Failed to spawn OCR (tried: ${bin}). ${err.message}`,
          ),
        );
      });

      child.on('close', (code) => {
        clearTimeout(killTimer);
        const elapsedMs = Date.now() - startedAt;
        const stderr = Buffer.concat(errChunks).toString('utf8');
        const stdout = Buffer.concat(chunks).toString('utf8');

        const seconds = (elapsedMs / 1000).toFixed(2);
        this.logger.log(
          `OCR subprocess finished — this run took ${seconds}s (${elapsedMs}ms), exit code ${code}.`,
        );

        if (code !== 0) {
          this.logger.error(`OCR exit ${code}: ${stderr || stdout}`);
          reject(new Error(stderr.trim() || `OCR process exited with code ${code}`));
          return;
        }

        resolve(stdout);
      });
    });
  }
}
