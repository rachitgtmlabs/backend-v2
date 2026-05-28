import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { isPersonalDomain } from './personal-domains';
import {
  Organization,
  OrganizationDocument,
  OrganizationKind,
} from './schemas/organization.schema';

function newOrgId(): string {
  return `org_${randomBytes(8).toString('hex')}`;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
  ) {}

  /**
   * Resolve (or create) the organization an email belongs to.
   *  - Workspace domains (anything not in PERSONAL_EMAIL_DOMAINS) share one
   *    org per domain.
   *  - Personal emails (gmail.com, etc.) each get their own single-user org,
   *    keyed on the full email address, so unrelated personal accounts stay
   *    isolated from each other.
   */
  async resolveForEmail(emailRaw: string): Promise<OrganizationDocument> {
    const email = emailRaw.trim().toLowerCase();
    const at = email.indexOf('@');
    if (at <= 0 || at === email.length - 1) {
      throw new BadRequestException(`Invalid email: ${emailRaw}`);
    }
    const domain = email.slice(at + 1);
    const personal = isPersonalDomain(domain);
    const key = personal ? email : domain;
    const kind: OrganizationKind = personal ? 'personal' : 'domain';
    const name = personal ? `Personal: ${email}` : domain;

    const doc = await this.orgModel
      .findOneAndUpdate(
        { domain: key },
        {
          $setOnInsert: {
            orgId: newOrgId(),
            domain: key,
            name,
            kind,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    return doc;
  }

  findByOrgId(orgId: string): Promise<OrganizationDocument | null> {
    return this.orgModel.findOne({ orgId }).exec();
  }
}
