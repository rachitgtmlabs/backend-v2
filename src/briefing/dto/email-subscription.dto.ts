import { IsBoolean } from 'class-validator';

export class EmailSubscriptionDto {
  @IsBoolean()
  enabled: boolean;
}
