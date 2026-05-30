import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

/**
 * Sent back by the client after `startRegistration()` to enroll a new passkey.
 * `challengeToken` is the short-lived signed token returned by the
 * register/options endpoint and proves which challenge this attests to.
 */
export class PasskeyRegisterVerifyDto {
  @IsString()
  @IsNotEmpty({ message: 'challengeToken is required' })
  @MaxLength(4096)
  challengeToken: string;

  @IsObject()
  @IsNotEmpty({ message: 'response is required' })
  response: RegistrationResponseJSON;
}

/**
 * Sent back by the client after `startAuthentication()` to log in with a
 * passkey. No user identifier is needed — the credential resolves to a user.
 */
export class PasskeyLoginVerifyDto {
  @IsString()
  @IsNotEmpty({ message: 'challengeToken is required' })
  @MaxLength(4096)
  challengeToken: string;

  @IsObject()
  @IsNotEmpty({ message: 'response is required' })
  response: AuthenticationResponseJSON;
}
