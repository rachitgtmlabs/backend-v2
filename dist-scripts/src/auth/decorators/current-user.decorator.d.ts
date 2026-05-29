export declare const CurrentUser: (...dataOrPipes: (keyof import("../../users/schemas/user.schema").User | keyof import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | undefined)[]) => ParameterDecorator;
export declare const CurrentUserId: (...dataOrPipes: unknown[]) => ParameterDecorator;
export declare const CurrentOrgId: (...dataOrPipes: unknown[]) => ParameterDecorator;
