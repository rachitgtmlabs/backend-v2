import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { SocialLoginDto } from './dto/social-login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(userData: RegisterDto): Promise<{
        access_token: string;
        user: Omit<Record<string, unknown>, "password"> & {
            _id: unknown;
            email?: string;
            name?: string;
            organization_id?: string;
        };
    }>;
    login(req: ExpressRequest): Promise<{
        access_token: string;
        user: Omit<Record<string, unknown>, "password"> & {
            _id: unknown;
            email?: string;
            name?: string;
            organization_id?: string;
        };
    }>;
    googleLogin(body: SocialLoginDto): Promise<{
        access_token: string;
        user: Omit<Record<string, unknown>, "password"> & {
            _id: unknown;
            email?: string;
            name?: string;
            organization_id?: string;
        };
    }>;
    phoneLogin(body: SocialLoginDto): Promise<{
        access_token: string;
        user: Omit<Record<string, unknown>, "password"> & {
            _id: unknown;
            email?: string;
            name?: string;
            organization_id?: string;
        };
    }>;
    getProfile(req: ExpressRequest): Express.User | undefined;
}
