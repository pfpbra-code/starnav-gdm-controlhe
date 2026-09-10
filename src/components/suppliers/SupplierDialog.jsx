import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const EMPTY = {
  company_name: '',
  trading_name: '',
  cnpj: '',
  email: '',
  phone: '',
  contact_name: '',
  address: '',
  status: 'active',
};

/**
 * Cadastro/edição de fornecedor — entidade de gestão interna.
 * Fornecedores não possuem acesso ao sistema (sem senha/login).
 */
export default function SupplierDialog({ open, onOpenChange, supplier, onSubmit, isSaving }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      setForm(supplier ? { ...EMPTY, ...supplier } : EMPTY);
    }
  }, [open, supplier]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          <DialogDescription>
            Cadastro interno — o fornecedor não recebe acesso ao sistema.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Razão Social *</Label>
              <Input value={form.company_name} onChange={set('company_name')} required />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input value={form.trading_name} onChange={set('trading_name')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <Input value={form.cnpj} onChange={set('cnpj')} required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={set('email')} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={set('phone')} />
              </div>
              <div className="space-y-2">
                <Label>Contato Principal</Label>
                <Input value={form.contact_name} onChange={set('contact_name')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={set('address')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-sky-600 hover:bg-sky-700" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}