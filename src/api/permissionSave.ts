import { rbacApi, type EffectivePermission } from './rbacApi';
import { accessApi } from './accessApi';
import { getApiErrorMessage } from './apiErrors';

export interface PermissionSaveResult {
  ok: number;
  failed: { featureKey: string; message: string }[];
}

type PermSource = EffectivePermission['source'];

export async function applyPermissionChange(
  staffId: string,
  featureKey: string,
  granted: boolean,
  previousGranted: boolean,
  source: PermSource | undefined,
  reason = 'Updated from Access Manager'
): Promise<void> {
  try {
    if (granted) {
      await rbacApi.setOverride(staffId, featureKey, 'ALLOW', reason);
      return;
    }
    if (source === 'UserDeny' && !previousGranted) {
      await rbacApi.removeOverride(staffId, featureKey);
      return;
    }
    if (source === 'UserAllow' || previousGranted) {
      await rbacApi.setOverride(staffId, featureKey, 'DENY', reason);
      return;
    }
    await rbacApi.setOverride(staffId, featureKey, 'DENY', reason);
  } catch (rbacErr) {
    await accessApi.toggleFeature(staffId, featureKey, granted);
    if (!granted) throw rbacErr;
  }
}

export async function saveBooleanPermissionChanges(
  staffId: string,
  changes: {
    featureKey: string;
    granted: boolean;
    previousGranted: boolean;
    source?: PermSource;
  }[],
  reason?: string
): Promise<PermissionSaveResult> {
  const failed: { featureKey: string; message: string }[] = [];
  let ok = 0;
  for (const c of changes) {
    try {
      await applyPermissionChange(
        staffId,
        c.featureKey,
        c.granted,
        c.previousGranted,
        c.source,
        reason
      );
      ok++;
    } catch (err) {
      failed.push({ featureKey: c.featureKey, message: getApiErrorMessage(err) });
    }
  }
  return { ok, failed };
}

export async function saveTriStatePermissionChanges(
  staffId: string,
  items: {
    featureKey: string;
    status: 'ALLOW' | 'DENY' | 'INHERIT';
    previous: 'ALLOW' | 'DENY' | 'INHERIT';
  }[]
): Promise<PermissionSaveResult> {
  const failed: { featureKey: string; message: string }[] = [];
  let ok = 0;
  for (const { featureKey, status, previous } of items) {
    if (status === previous) continue;
    try {
      if (status === 'INHERIT') await rbacApi.removeOverride(staffId, featureKey);
      else await rbacApi.setOverride(staffId, featureKey, status);
      ok++;
    } catch (err) {
      failed.push({ featureKey, message: getApiErrorMessage(err) });
    }
  }
  return { ok, failed };
}
