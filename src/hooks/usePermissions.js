import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  effectivePermissions,
  hasPermission as hasPermissionFor,
  hasAnyPermission as hasAnyPermissionFor,
  hasAllPermissions as hasAllPermissionsFor,
  canAccessModule as canAccessModuleFor,
  canAccessVessel as canAccessVesselFor,
  allowedVesselIds,
  scopeGdms,
} from "@/lib/permissions";

/**
 * Hook central de permissões e escopo.
 * Use sempre este hook em vez de comparar `user.role` para decidir ações.
 */
export function usePermissions() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  return useMemo(
    () => ({
      user,
      isLoading,
      role: user?.role || null,
      permissions: effectivePermissions(user),
      hasPermission: (p) => hasPermissionFor(user, p),
      hasAnyPermission: (p) => hasAnyPermissionFor(user, p),
      hasAllPermissions: (p) => hasAllPermissionsFor(user, p),
      canAccessModule: (m) => canAccessModuleFor(user, m),
      canAccessVessel: (id) => canAccessVesselFor(user, id),
      vesselScope: allowedVesselIds(user),
      scopeGdms: (gdms) => scopeGdms(user, gdms),
    }),
    [user, isLoading],
  );
}

export default usePermissions;