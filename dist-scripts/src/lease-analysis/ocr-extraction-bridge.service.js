"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OcrExtractionBridgeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrExtractionBridgeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_child_process_1 = require("node:child_process");
const fsSync = __importStar(require("node:fs"));
const fs = __importStar(require("node:fs/promises"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
let OcrExtractionBridgeService = OcrExtractionBridgeService_1 = class OcrExtractionBridgeService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(OcrExtractionBridgeService_1.name);
        this.projectRoot = process.cwd();
        this.scriptPath = path.join(this.projectRoot, 'ocr_extraction.py');
    }
    onModuleInit() {
        const { bin, args } = this.resolveSpawnConfig(['--version']);
        const child = (0, node_child_process_1.spawn)(bin, args, {
            cwd: this.projectRoot,
            env: { ...process.env },
            stdio: 'ignore',
        });
        child.on('error', () => { });
        child.on('close', (code) => {
            if (code === 0) {
                this.logger.log(`OCR environment pre-warmed successfully (bin: ${bin}).`);
            }
        });
    }
    ocrSubprocessTimeoutMs() {
        const raw = this.config.get('OCR_SUBPROCESS_TIMEOUT_MS');
        const n = raw ? parseInt(raw, 10) : NaN;
        if (Number.isFinite(n) && n > 0) {
            return n;
        }
        return 900_000;
    }
    resolveSpawnConfig(extraArgs) {
        const fromEnv = this.config.get('UV_PATH');
        if (fromEnv && fromEnv.includes('python')) {
            return { bin: fromEnv, args: extraArgs };
        }
        let uvBin;
        if (fromEnv) {
            uvBin = fromEnv;
        }
        else {
            const candidates = ['/opt/homebrew/bin/uv', '/usr/local/bin/uv'];
            uvBin = candidates.find((c) => fsSync.existsSync(c)) ?? 'uv';
        }
        return { bin: uvBin, args: ['run', 'python', ...extraArgs] };
    }
    async extractTextFromPdfBuffer(buffer) {
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lease-ocr-'));
        const pdfPath = path.join(tmpDir, 'upload.pdf');
        await fs.writeFile(pdfPath, buffer);
        try {
            const stdout = await this.runPythonScript([pdfPath]);
            return JSON.parse(stdout);
        }
        catch (err) {
            if (err instanceof SyntaxError) {
                this.logger.error('OCR stdout was not valid JSON');
            }
            throw err;
        }
        finally {
            await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => { });
        }
    }
    async extractTextFromPdfPath(pdfPath) {
        const stdout = await this.runPythonScript([pdfPath]);
        try {
            return JSON.parse(stdout);
        }
        catch {
            this.logger.error(`OCR stdout was not JSON. First 500 chars: ${stdout.slice(0, 500)}`);
            throw new Error('OCR script returned invalid JSON');
        }
    }
    runPythonScript(args) {
        const timeoutMs = this.ocrSubprocessTimeoutMs();
        const startedAt = Date.now();
        const { bin, args: spawnArgs } = this.resolveSpawnConfig([this.scriptPath, ...args]);
        return new Promise((resolve, reject) => {
            const chunks = [];
            const errChunks = [];
            this.logger.log(`PDF text subprocess starting (${bin} ${spawnArgs[0]} …); timeoutMs=${timeoutMs}.`);
            const child = (0, node_child_process_1.spawn)(bin, spawnArgs, {
                cwd: this.projectRoot,
                env: { ...process.env },
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            const killTimer = setTimeout(() => {
                this.logger.error(`OCR subprocess exceeded timeout ${timeoutMs}ms — sending SIGKILL to pid=${child.pid}`);
                child.kill('SIGKILL');
            }, timeoutMs);
            child.stderr?.on('data', (d) => {
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
            stdoutStream.on('data', (d) => chunks.push(d));
            child.on('error', (err) => {
                clearTimeout(killTimer);
                reject(new Error(`Failed to spawn OCR (tried: ${bin}). ${err.message}`));
            });
            child.on('close', (code) => {
                clearTimeout(killTimer);
                const elapsedMs = Date.now() - startedAt;
                const stderr = Buffer.concat(errChunks).toString('utf8');
                const stdout = Buffer.concat(chunks).toString('utf8');
                const seconds = (elapsedMs / 1000).toFixed(2);
                this.logger.log(`OCR subprocess finished — this run took ${seconds}s (${elapsedMs}ms), exit code ${code}.`);
                if (code !== 0) {
                    this.logger.error(`OCR exit ${code}: ${stderr || stdout}`);
                    reject(new Error(stderr.trim() || `OCR process exited with code ${code}`));
                    return;
                }
                resolve(stdout);
            });
        });
    }
};
exports.OcrExtractionBridgeService = OcrExtractionBridgeService;
exports.OcrExtractionBridgeService = OcrExtractionBridgeService = OcrExtractionBridgeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OcrExtractionBridgeService);
//# sourceMappingURL=ocr-extraction-bridge.service.js.map