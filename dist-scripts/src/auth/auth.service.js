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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const organizations_service_1 = require("../organizations/organizations.service");
const bcrypt = __importStar(require("bcrypt"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("@nestjs/config");
const BCRYPT_ROUNDS = 12;
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, jwtService, configService, organizationsService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.organizationsService = organizationsService;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.initializeFirebase();
    }
    initializeFirebase() {
        if (admin.apps.length)
            return;
        const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY');
        const projectId = this.configService.get('FIREBASE_PROJECT_ID');
        const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');
        try {
            if (privateKey && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey: privateKey.replace(/\\n/g, '\n'),
                    }),
                });
                this.logger.log('Firebase Admin initialized with service account key');
            }
            else {
                admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    projectId,
                });
                this.logger.log('Firebase Admin initialized with Application Default Credentials');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Firebase Admin initialization failed: ${message}`);
            this.logger.warn('Google/Phone auth will be unavailable until fixed.');
        }
    }
    async validateUser(email, pass) {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.password)
            return null;
        const matches = await bcrypt.compare(pass, user.password);
        if (!matches)
            return null;
        const { password: _password, ...result } = user.toObject();
        void _password;
        return result;
    }
    async login(user) {
        const u = user;
        const payload = { email: u.email, sub: u._id };
        if (u.organization_id)
            payload.org = u.organization_id;
        return {
            access_token: this.jwtService.sign(payload),
            user: u,
        };
    }
    async register(userData) {
        const existingUser = await this.usersService.findByEmail(userData.email);
        if (existingUser) {
            throw new common_1.BadRequestException('User already exists');
        }
        const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);
        const user = await this.usersService.create({
            ...userData,
            password: hashedPassword,
            provider: 'local',
        });
        const { password: _password, ...result } = user.toObject();
        void _password;
        return this.login(result);
    }
    async googleLogin(idToken) {
        if (!admin.apps.length) {
            this.logger.error('Google login attempted but Firebase Admin is not initialized');
            throw new common_1.UnauthorizedException('Authentication service is unavailable');
        }
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const { email, name, picture, email_verified } = decodedToken;
            if (!email) {
                throw new common_1.UnauthorizedException('Google account must have an email');
            }
            if (email_verified === false) {
                throw new common_1.UnauthorizedException('Google email is not verified');
            }
            const org = await this.organizationsService.resolveForEmail(email);
            const user = await this.usersService.findOrCreateSocial({
                email,
                name: name || email.split('@')[0],
                photoURL: picture,
                provider: 'google',
                organization_id: org.orgId,
            });
            return this.login(user.toObject());
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException)
                throw error;
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Google token verification failed: ${message}`);
            throw new common_1.UnauthorizedException('Invalid Google token');
        }
    }
    async phoneLogin(idToken) {
        if (!admin.apps.length) {
            this.logger.error('Phone login attempted but Firebase Admin is not initialized');
            throw new common_1.UnauthorizedException('Authentication service is unavailable');
        }
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const { phone_number } = decodedToken;
            if (!phone_number) {
                throw new common_1.UnauthorizedException('Phone token missing phone_number');
            }
            const user = await this.usersService.findOrCreateSocial({
                phone: phone_number,
                name: `User ${phone_number}`,
                provider: 'phone',
            });
            return this.login(user.toObject());
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Phone token verification failed: ${message}`);
            throw new common_1.UnauthorizedException('Invalid Phone token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        organizations_service_1.OrganizationsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map