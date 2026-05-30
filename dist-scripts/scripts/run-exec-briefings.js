"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("../src/app.module");
const exec_briefing_service_1 = require("../src/exec-briefing/exec-briefing.service");
const organizations_service_1 = require("../src/organizations/organizations.service");
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
async function main() {
    const log = new common_1.Logger('run-exec-briefings');
    const onlyOrgId = process.argv[2]?.trim();
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const execBriefings = app.get(exec_briefing_service_1.ExecBriefingService);
        const orgsService = app.get(organizations_service_1.OrganizationsService);
        const orgs = onlyOrgId
            ? await orgsService.findByOrgId(onlyOrgId).then((o) => (o ? [o] : []))
            : await orgsService.listAll();
        if (orgs.length === 0) {
            log.warn(onlyOrgId ? `No org found: ${onlyOrgId}` : 'No organizations found.');
            return;
        }
        const now = new Date();
        for (const org of orgs) {
            const timezone = org.timezone || 'America/New_York';
            const briefing = await execBriefings.generateForOrg(org.orgId, {
                timezone,
                now,
                force: true,
            });
            log.log(`${org.orgId} (${org.name}): ` +
                `whatsWorking=${briefing.whatsWorking.length}, ` +
                `zoomIn=${briefing.zoomIn.length}, ` +
                `questions=${briefing.questions.length}`);
            log.log(`  headline → ${briefing.headline}`);
        }
    }
    finally {
        await app.close();
    }
}
main()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=run-exec-briefings.js.map