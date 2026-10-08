import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Lock } from 'lucide-react';
import {
  AVAILABLE_PERMISSIONS,
  ALL_PERMISSION_IDS,
  SECTOR_BASE_PERMISSIONS,
  SECTORS,
} from '@/lib/permissions';

const userCustom = (user, key) =>
  user?.[key] !== undefined ? user[key] : user?.data?.[key];

const SECTOR_LABELS = Object.fromEntries(SECTORS.map((s) => [s.key, s.label]));

/**
 * Autorizações individuais do ADM — acessos adicionais além dos concedidos
 * automaticamente pelos setores vinculados do usuário.
 */
export default function UserPermissions({ user, open, onOpenChange, onSave, isSaving }) {
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    if (open) {
      setPermissions((userCustom(user, 'permissions') || []).filter(Boolean));
    }
  }, [open, user]);

  const sectors = (userCustom(user, 'sectors') || []).filter((s) => SECTOR_BASE_PERMISSIONS[s]);
  const isAdmin = user?.role === 'admin';
  const isVessel = user?.role === 'vessel_user';

  // Permissões já garantidas automaticamente (setor, embarcação ou ADM):
  // exibidas marcadas e travadas — não são autorizações individuais.
  const autoGranted = new Set(
    isAdmin
      ? ALL_PERMISSION_IDS
      : sectors.flatMap((s) => SECTOR_BASE_PERMISSIONS[s])
  );

  const handleToggle = (permissionId) => {
    setPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autorizações Individuais
          </DialogTitle>
          <DialogDescription>
            Usuário: {user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
            {isAdmin ? (
              <p className="text-sm text-sky-800">
                <strong>Administrador:</strong> acesso total ao sistema — todas as
                permissões são automáticas.
              </p>
            ) : isVessel ? (
              <p className="text-sm text-sky-800">
                <strong>Embarcação:</strong> perfil com acessos fixos (GDMs da
                própria embarcação).
              </p>
            ) : (
              <p className="text-sm text-sky-800">
                <strong>Setores vinculados:</strong>{' '}
                {sectors.length
                  ? sectors.map((s) => SECTOR_LABELS[s]).join(', ')
                  : 'nenhum (o ADM vincula em Configurações > Responsáveis por Setor)'}
                . Permissões <Lock className="inline h-3 w-3" /> travadas vêm dos
                setores — aqui o ADM concede apenas acessos adicionais.
              </p>
            )}
          </div>

          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category}>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                {category}
                <Badge variant="outline">
                  {perms.filter((p) => autoGranted.has(p.id) || permissions.includes(p.id)).length}/
                  {perms.length}
                </Badge>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {perms.map((perm) => {
                  const auto = autoGranted.has(perm.id);
                  return (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={perm.id}
                        checked={auto || permissions.includes(perm.id)}
                        disabled={auto || isAdmin || isVessel}
                        onCheckedChange={() => handleToggle(perm.id)}
                      />
                      <Label
                        htmlFor={perm.id}
                        className={
                          auto
                            ? 'text-sm text-slate-400 cursor-not-allowed flex items-center gap-1'
                            : 'text-sm cursor-pointer'
                        }
                      >
                        {perm.label}
                        {auto && <Lock className="h-3 w-3" />}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              Autorizações individuais selecionadas: <strong>{permissions.length}</strong>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-sky-600 hover:bg-sky-700"
            onClick={() => onSave(permissions)}
            disabled={isSaving || isAdmin || isVessel}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Autorizações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}