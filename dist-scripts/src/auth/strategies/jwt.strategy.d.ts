import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
interface JwtPayload {
    email?: string;
    sub: string;
    org?: string;
    iat?: number;
    exp?: number;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private usersService;
    constructor(configService: ConfigService, usersService: UsersService);
    validate(payload: JwtPayload): Promise<import("../../users/schemas/user.schema").UserDocument>;
}
export {};
