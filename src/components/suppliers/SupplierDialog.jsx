import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { SUPPLIER_CATEGORIES } from '@/lib/supplierCategories';
import SupplierLogo from '@/components/suppliers/SupplierLogo';
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
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EMPTY = {
  company_name: '',
  trading_name: '',
  cnpj: '',
  email: '',
  phone: '',
  contact_name: '',
  address: '',
  categories: [],
  photo_uri: '',
  status: 'active',
};

const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Cadastro/edição de fornecedor — entidade de gestão interna.
 * Ramos de atividade em múltipla seleção (padronizados) e
 * upload de foto/logomarca (JPG, PNG, WEBP).
 * Fornecedores não possuem acesso ao sistema (sem senha/login).
 */
export default function SupplierDialog({ open, onOpenChange, supplier, onSubmit, isSaving }) {
  const [form, setForm] = useState(EMPTY);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        supplier
          ? { ...EMPTY, ...supplier, categories: supplier.categories || [] }
          : EMPTY
      );
      setUploadingPhoto(false);
    }
  }, [open, supplier]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const toggleCategory = (category) =>
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Envie uma imagem JPG, PNG ou WEBP.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setForm((prev) => ({ ...prev, photo_uri: file_uri }));
    } catch (err) {
      toast.error('Erro ao enviar a imagem.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const removePhoto = () => setForm((prev) => ({ ...prev, photo_uri: '' }));

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
          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
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
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={set('email')} />
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

            {/* Foto / Logomarca */}
            <div className="space-y-2">
              <Label>Foto / Logomarca</Label>
              <div className="flex items-center gap-3">
                {form.photo_uri ? (
                  <div className="relative shrink-0">
                    <SupplierLogo
                      uri={form.photo_uri}
                      imgClassName="h-16 w-16 rounded-lg border border-slate-200"
                      fallbackClassName="h-16 w-16 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
                      title="Remover imagem"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-sky-400 hover:text-sky-600 transition-colors">
                    {uploadingPhoto ? (
                      <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handlePhoto}
                      disabled={uploadingPhoto}
                    />
                  </label>
                )}
                <p className="text-xs text-slate-400">
                  JPG, PNG ou WEBP. Exibida na listagem, na ficha e nos detalhes do
                  fornecedor.
                </p>
              </div>
            </div>

            {/* Ramos de atividade — múltipla seleção padronizada */}
            <div className="space-y-2">
              <Label>Ramos de Atividade</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUPPLIER_CATEGORIES.map((c) => (
                  <label
                    key={c}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors',
                      form.categories.includes(c)
                        ? 'border-sky-500 bg-sky-50 text-sky-800'
                        : 'border-slate-200 text-slate-600 hover:border-sky-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={form.categories.includes(c)}
                      onChange={() => toggleCategory(c)}
                      className="h-4 w-4 accent-sky-600"
                    />
                    {c}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Marque todos os ramos que o fornecedor atende.
              </p>
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