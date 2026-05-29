import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { OrganizationsService } from '../organizations/organizations.service';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
type SafeUser = Omit<Record<string, unknown>, 'password'> & {
    _id: unknown;
    email?: string;
    name?: string;
    organization_id?: string;
};
export declare class AuthService {
    private usersService;
    private jwtService;
    private configService;
    private organizationsService;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService, organizationsService: OrganizationsService);
    private initializeFirebase;
    validateUser(email: string, pass: string): Promise<SafeUser | null>;
    login(user: SafeUser | UserDocument | Express.User): Promise<{
        access_token: string;
        user: SafeUser;
    }>;
    register(userData: RegisterDto): Promise<{
        access_token: string;
        user: SafeUser;
    }>;
    googleLogin(idToken: string): Promise<{
        access_token: string;
        user: SafeUser;
    }>;
    phoneLogin(idToken: string): Promise<{
        access_token: string;
        user: SafeUser;
    }>;
}
export {};
