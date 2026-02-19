import React, { useState } from 'react';
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
import { Loader2, Shield } from 'lucide-react';

const AVAILABLE_PERMISSIONS = [
  { id: 'create_gdm', label: 'Criar GDM', category: 'GDM' },
  { id: 'edit_gdm', label: 'Editar GDM', category: 'GDM' },
  { id: 'delete_gdm', label: 'Deletar GDM', category: 'GDM' },
  { id: 'approve_gdm', label: 'Aprovar GDM', category: 'GDM' },
  { id: 'manage_vessels', label: 'Gerenciar Embarcações', category: 'Cadastros' },
  { id: 'manage_equipment', label: 'Gerenciar Equipamentos', category: 'Cadastros' },
  { id: 'manage_suppliers', label: 'Gerenciar Fornecedores', category: 'Cadastros' },
  { id: 'manage_users', label: 'Gerenciar Usuários', category: 'Administração' },
  { id: 'view_audit_logs', label: 'Ver Logs de Auditoria', category: 'Administração' },
  { id: 'send_to_supplier', label: 'Enviar ao Fornecedor', category: 'Serviços' },
  { id: 'quote_analysis', label: 'Análise de Cotação', category: 'Manutenção' },
  { id: 'submit_quote', label: 'Enviar Cotação', category: 'Fornecedor' },
  { id: 'export_reports', label: 'Exportar Relatórios', category: 'Relatórios' },
  { id: 'system_settings', label: 'Configurações do Sistema', category: 'Administração' },
];

export default function UserPermissions({ user, open, onOpenChange, onSave, isSaving }) {
  const [permissions, setPermissions] = useState(user?.permissions || []);

  const handleToggle = (permissionId) => {
    setPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
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
            Permissões Específicas
          </DialogTitle>
          <DialogDescription>
            Usuário: {user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Atenção:</strong> Estas permissões são adicionais ao perfil base do usuário.
              O perfil "{user?.role}" já possui permissões padrão.
            </p>
          </div>

          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category}>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                {category}
                <Badge variant="outline">
                  {perms.filter(p => permissions.includes(p.id)).length}/{perms.length}
                </Badge>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {perms.map((perm) => (
                  <div key={perm.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={perm.id}
                      checked={permissions.includes(perm.id)}
                      onCheckedChange={() => handleToggle(perm.id)}
                    />
                    <Label
                      htmlFor={perm.id}
                      className="text-sm cursor-pointer"
                    >
                      {perm.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              Total de permissões selecionadas: <strong>{permissions.length}</strong>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange}>
            Cancelar
          </Button>
          <Button
            className="bg-sky-600 hover:bg-sky-700"
            onClick={() => onSave(permissions)}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}