import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OrganizationsService } from '../../organizations/organizations.service';

/**
 * Blocks CAM reconciliation endpoints when the caller's org has the feature
 * turned off (Organization.camReconciliationEnabled === false). The flag is
 * managed from the /superadmin page. Orgs default to enabled, so existing
 * behavior is preserved until a superadmin disables it.
 */
@Injectable()
export class CamEnabledGuard implements CanActivate {
  constructor(private readonly organizationsService: OrganizationsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { organization_id?: string } | undefined;
    const orgId = user?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context required');
    }
    const org = await this.organizationsService.findByOrgId(orgId);
    if (org && org.camReconciliationEnabled === false) {
      throw new ForbiddenException(
        'CAM reconciliation is disabled for this organization',
      );
    }
    return true;
  }
}
