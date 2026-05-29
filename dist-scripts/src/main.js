"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const app_module_1 = require("./app.module");
(0, dotenv_1.config)();
const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
if (gac && !(0, path_1.isAbsolute)(gac)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = (0, path_1.resolve)(process.cwd(), gac);
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'public'), { prefix: '/static/' });
    app.enableCors({
        origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
        credentials: true,
    });
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    const port = process.env.PORT ?? 8080;
    await app.listen(port, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map