import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export interface OcrExtractionJson {
  full_text: string;
  source_pdf?: string;
  det_arch?: string;
  reco_arch?: string;
  exported?: unknown;
}

/**
 * Runs {@link lease-backend-v2}/ocr_extraction.py via `uv run` on a PDF path.
 * `uv run` uses the project virtualenv — no manual activation needed.
 */
@Injectable()
export class OcrExtractionBridgeService {
  private readonly logger = new Logger(OcrExtractionBridgeService.name);

  private readonly projectRoot = process.cwd();
  private readonly scriptPath = path.join(this.projectRoot, 'ocr_extraction.py');

  constructor(private readonly config: ConfigService) {}

  private ocrSubprocessTimeoutMs(): number {
    const raw = this.config.get<string>('OCR_SUBPROCESS_TIMEOUT_MS');
    const n = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
    return 900_000;
  }

  /** Resolve uv binary: prefer UV_PATH env var, then /usr/local/bin/uv, then fallback to 'uv' on PATH */
  private resolveUvBin(): string {
    const fromEnv = this.config.get<string>('UV_PATH');
    if (fromEnv) return fromEnv;
    return '/usr/local/bin/uv';
  }
  /**
   * Writes PDF bytes to a temp file and runs OCR. Cleans up the temp directory.
   */
  async extractTextFromPdfBuffer(buffer: Buffer): Promise<OcrExtractionJson> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lease-ocr-'));
    const pdfPath = path.join(tmpDir, 'upload.pdf');
    await fs.writeFile(pdfPath, buffer);

    try {
      const stdout = await this.runUvPythonScript([pdfPath]);
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
    const stdout = await this.runUvPythonScript([pdfPath]);
    try {
      return JSON.parse(stdout) as OcrExtractionJson;
    } catch {
      this.logger.error(`OCR stdout was not JSON. First 500 chars: ${stdout.slice(0, 500)}`);
      throw new Error('OCR script returned invalid JSON');
    }
  }

  private runUvPythonScript(args: string[]): Promise<string> {
    const timeoutMs = this.ocrSubprocessTimeoutMs();
    const startedAt = Date.now();
    const uvBin = this.resolveUvBin();

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];

      this.logger.log(
        `OCR subprocess starting (${uvBin} run python …); timeoutMs=${timeoutMs}. Each request loads docTR weights in a new process — large PDFs can take many minutes.`,
      );

      // #region agent log
      void fetch(
        'http://127.0.0.1:7523/ingest/4ac1908c-e3be-4eb6-a040-8efa62511e86',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': 'cf65a2',
          },
          body: JSON.stringify({
            sessionId: 'cf65a2',
            location: 'ocr-extraction-bridge.service.ts:runUvPythonScript',
            message: 'pre-spawn OCR',
            data: {
              hypothesisId: 'H1',
              cwd: this.projectRoot,
              pathHead: (process.env.PATH ?? '').split(':').slice(0, 12),
            },
            timestamp: Date.now(),
            hypothesisId: 'H1',
            runId: process.env.DEBUG_RUN_ID ?? 'pre-verify',
          }),
        },
      ).catch(() => {});
      // #endregion

      const child: ChildProcess = spawn(
        uvBin,
        ['run', 'python', this.scriptPath, ...args],
        {
          cwd: this.projectRoot,
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

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
          this.logger.log(`[docTR stderr] ${line}`);
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
        // #region agent log
        const ne = err as NodeJS.ErrnoException;
        void fetch(
          'http://127.0.0.1:7523/ingest/4ac1908c-e3be-4eb6-a040-8efa62511e86',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': 'cf65a2',
            },
            body: JSON.stringify({
              sessionId: 'cf65a2',
              location: 'ocr-extraction-bridge.service.ts:spawn-error',
              message: 'OCR spawn error',
              data: {
                hypothesisId: 'H1',
                code: ne.code,
                pathHead: (process.env.PATH ?? '').split(':').slice(0, 12),
              },
              timestamp: Date.now(),
              hypothesisId: 'H1',
              runId: process.env.DEBUG_RUN_ID ?? 'pre-verify',
            }),
          },
        ).catch(() => {});
        // #endregion
        reject(
          new Error(
            `Failed to spawn OCR (is uv on PATH? tried: ${uvBin}). ${err.message}`,
          ),
        );
      });

      child.on('close', (code) => {
        clearTimeout(killTimer);
        const elapsedMs = Date.now() - startedAt;
        const stderr = Buffer.concat(errChunks).toString('utf8');
        const stdout = Buffer.concat(chunks).toString('utf8');

        this.logger.log(
          `OCR subprocess closed code=${code} elapsedMs=${elapsedMs}`,
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
