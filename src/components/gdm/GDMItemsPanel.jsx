import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  Package,
  Hash,
  ClipboardList,
  User2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Dot,
  AlertTriangle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { hasPermission } from '@/lib/permissions';
import {
  ITEM_DESTINATION_LABELS,
  ITEM_DESTINATION_OPTIONS,
  ITEM_DESTINATION_COLORS,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  ITEM_ACTION_LABELS,
  availableItemActions,
  itemResponsible,
  itemFlow,
  itemGroup,
  nextActionText,
  sortItemsByPriority,
  summarizeItems,
  OVERALL_LABELS,
} from '@/lib/gdmItems';
import GDMItemQrCode from './GDMItemQrCode';
import GDMItemPdfButton from './GDMItemPdfButton';

function ItemHistory({ itemId }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['gdmItemHistory', itemId],
    queryFn: () => base44.entities.GDMItemHistory.filter({ item_id: itemId }, 'created_date'),
    enabled: !!itemId,
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Carregando histórico...</p>;
  }
  if (history.length === 0) {
    return <p className="text-sm text-slate-500">Nenhuma movimentação registrada ainda.</p>;
  }
  return (
    <ul className="space-y-2">
      {history.map((h) => (
        <li key={h.id} className="text-sm border-l-2 border-slate-200 pl-3">
          <div className="font-medium">{ITEM_ACTION_LABELS[h.action] || h.action}</div>
          <div className="text-slate-500">
            {h.user_email || 'Sistema'} ·{' '}
            {h.created_date ? format(new Date(h.created_date), 'dd/MM/yyyy HH:mm') : ''}
          </div>
          {(h.previous_status || h.new_status) && (
            <div className="text-slate-500">
              {ITEM_STATUS_LABELS[h.previous_status] || '—'} →{' '}
              {ITEM_STATUS_LABELS[h.new_status] || '—'}
            </div>
          )}
          {h.observation && <div className="text-slate-600 mt-1">{h.observation}</div>}
        </li>
      ))}
    </ul>
  );
}

function Field({ icon: Icon, label, value }) {
  return (
    <div>
      <span className="text-slate-500 text-xs flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </span>
      <span className="font-medium block break-words">{value || '—'}</span>
    </div>
  );
}

function ItemFlow({ item }) {
  const steps = itemFlow(item);
  return (
    <ol className="space-y-1">
      {steps.map((s) => (
        <li key={s.status} className="flex items-center gap-2 text-sm">
          {s.state === 'done' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : s.state === 'current' ? (
            <Dot className="h-5 w-5 text-blue-600 flex-shrink-0" />
          ) : (
            <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />
          )}
          <span
            className={
              s.state === 'current'
                ? 'font-semibold text-slate-900'
                : s.state === 'done'
                  ? 'text-slate-600'
                  : 'text-slate-400'
            }
          >
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

const QUICK_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'mine', label: 'Minha ação' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'in_progress', label: 'Em andamento' },
  { key: 'completed', label: 'Finalizados' },
];

export default function GDMItemsPanel({ gdmId, user, gdm }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState({});
  const [pending, setPending] = useState(null); // { item, action, label, ... }
  const [observation, setObservation] = useState('');
  const [returnNumber, setReturnNumber] = useState('');
  const [destination, setDestination] = useState('');
  const [filter, setFilter] = useState('all');
  const [destFilter, setDestFilter] = useState('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['gdmItems', gdmId],
    queryFn: () => base44.entities.GDMItem.filter({ gdm_id: gdmId }, 'item_number'),
    enabled: !!gdmId,
  });

  const can = (key) => hasPermission(user, key);
  const summary = summarizeItems(items);
  const reasonRequired = pending?.action === 'reject';
  const isApproval = pending?.action === 'approve';
  const destinationChanged = isApproval && destination && destination !== pending?.item?.destination;

  const visibleItems = useMemo(() => {
    const sorted = sortItemsByPriority(items, can);
    return sorted.filter((i) => {
      if (destFilter !== 'all' && i.destination !== destFilter) return false;
      if (filter === 'all') return true;
      if (filter === 'mine') return availableItemActions(i, can).some((a) => !a.destructive);
      return itemGroup(i) === filter;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, destFilter, user]);

  const actionMutation = useMutation({
    mutationFn: ({ item, action, askReturnNumber }) =>
      base44.functions
        .invoke('gdmItemAction', {
          item_id: item.id,
          action,
          observation: observation.trim() || undefined,
          return_number: askReturnNumber ? returnNumber.trim() || undefined : undefined,
          destination: action === 'approve' ? destination || item.destination : undefined,
        })
        .then((res) => res.data),
    onSuccess: (_data, variables) => {
      toast.success('Ação registrada somente neste item');
      queryClient.invalidateQueries({ queryKey: ['gdmItems', gdmId] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistory', variables.item.id] });
      queryClient.invalidateQueries({ queryKey: ['gdm', gdmId] });
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      setPending(null);
      setObservation('');
      setReturnNumber('');
      setDestination('');
    },
    onError: (error) => toast.error(error?.message || 'Não foi possível concluir a ação'),
  });

  const openAction = (item, a) => {
    setPending({ item, ...a });
    setObservation('');
    setReturnNumber('');
    setDestination(item.destination || '');
  };

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 text-center text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 text-center text-slate-500">
          Esta guia ainda não possui itens cadastrados.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens da GDM ({items.length})
            </CardTitle>
            <CardDescription>
              Cada item possui aprovação, tratativa, responsável, status e histórico próprios.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {OVERALL_LABELS[summary.overall]} · {summary.completed}/{summary.total} finalizados
          </Badge>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 pt-3">
          {QUICK_FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'default' : 'outline'}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            variant={destFilter === 'all' ? 'secondary' : 'ghost'}
            onClick={() => setDestFilter('all')}
          >
            Todos os destinos
          </Button>
          {Object.entries(ITEM_DESTINATION_LABELS).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={destFilter === value ? 'secondary' : 'ghost'}
              onClick={() => setDestFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {visibleItems.length === 0 && (
          <p className="text-sm text-slate-500 py-6 text-center">
            Nenhum item corresponde a este filtro.
          </p>
        )}
        {visibleItems.map((item) => {
          const actions = availableItemActions(item, can);
          const primary = actions.filter((a) => !a.destructive);
          const isOpen = !!expanded[item.id];
          const needsMe = primary.length > 0;
          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 space-y-3 ${needsMe ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="w-full text-left flex flex-wrap items-center gap-2"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                <span className="font-semibold">
                  {String(item.item_number).padStart(2, '0')}
                </span>
                <span className="font-medium">{item.equipment_name}</span>
                {item.equipment_code && (
                  <span className="text-slate-400 text-sm">({item.equipment_code})</span>
                )}
                <span className="text-sm text-slate-500">Qtd. {item.quantity}</span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full border ${ITEM_DESTINATION_COLORS[item.destination] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
                >
                  {ITEM_DESTINATION_LABELS[item.destination] || item.destination}
                </span>
                <span
                  className={`ml-auto text-xs px-2 py-1 rounded-full ${ITEM_STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700'}`}
                >
                  {ITEM_STATUS_LABELS[item.status] || item.status}
                </span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Field icon={Hash} label="Número de série" value={item.serial_number} />
                <Field icon={ClipboardList} label="OS" value={item.os_number} />
                <Field icon={User2} label="Responsável atual" value={itemResponsible(item)} />
                <Field label="Fornecedor" value={item.supplier_name || '—'} />
              </div>

              {/* Ação necessária */}
              <div
                className={`rounded-lg p-3 text-sm flex flex-wrap items-center gap-3 ${needsMe ? 'bg-amber-100/70 text-amber-900' : 'bg-slate-50 text-slate-600'}`}
              >
                {needsMe && <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
                <span className="flex-1 min-w-[12rem]">{nextActionText(item)}</span>
                <div className="flex flex-wrap gap-2">
                  {actions.map((a) => (
                    <Button
                      key={a.action}
                      size="sm"
                      variant={a.destructive ? 'outline' : 'default'}
                      className={a.destructive ? 'text-red-600 border-red-200 bg-white' : ''}
                      onClick={() => openAction(item, a)}
                    >
                      {a.label}
                    </Button>
                  ))}
                  <GDMItemQrCode item={item} gdm={gdm} variant="outline" size="sm" />
                  <GDMItemPdfButton item={item} gdm={gdm} variant="outline" size="sm" />
                  <Button size="sm" variant="ghost" onClick={() => toggle(item.id)}>
                    {isOpen ? 'Fechar tratativa' : 'Abrir tratativa'}
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                  <div className="space-y-4 pt-3">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Informações do item</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <Field label="Equipamento" value={item.equipment_name} />
                        <Field label="Código" value={item.equipment_code} />
                        <Field label="Quantidade" value={item.quantity} />
                        <Field label="Número de série" value={item.serial_number} />
                        <Field label="OS" value={item.os_number} />
                        <Field
                          label="Destino"
                          value={ITEM_DESTINATION_LABELS[item.destination] || item.destination}
                        />
                        {item.destination === 'stock_return' && item.stock_return_confirmed && (
                          <Field label="Número da devolução" value={item.stock_return_number} />
                        )}
                        {item.destination === 'discard' && item.discard_authorized_at && (
                          <Field
                            label="Descarte autorizado em"
                            value={format(new Date(item.discard_authorized_at), 'dd/MM/yyyy HH:mm')}
                          />
                        )}
                        {item.notes && <Field label="Observação" value={item.notes} />}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Fluxo do item</h4>
                      <ItemFlow item={item} />
                    </div>
                  </div>
                  <div className="pt-3">
                    <h4 className="text-sm font-semibold mb-2">Histórico do item</h4>
                    <ItemHistory itemId={item.id} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      {/* Ação sobre um item */}
      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pending?.label}</DialogTitle>
            <DialogDescription>
              Você está tratando somente o item{' '}
              {pending ? String(pending.item.item_number).padStart(2, '0') : ''} —{' '}
              {pending?.item?.equipment_name} (destino{' '}
              {ITEM_DESTINATION_LABELS[pending?.item?.destination] || '—'}). Os demais itens desta
              GDM não serão alterados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isApproval && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Equipamento" value={pending?.item?.equipment_name} />
                  <Field label="Código" value={pending?.item?.equipment_code} />
                  <Field label="OS" value={pending?.item?.os_number} />
                  <Field label="Número de série" value={pending?.item?.serial_number} />
                </div>
                <div className="space-y-2">
                  <Label>Tratativa / destino do item</Label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a tratativa" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_DESTINATION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Tratativa cadastrada:{' '}
                    {ITEM_DESTINATION_LABELS[pending?.item?.destination] || '—'}.{' '}
                    {destinationChanged
                      ? 'Ao confirmar, a tratativa será alterada e o item seguirá o novo fluxo.'
                      : 'Confirme para manter esta tratativa.'}
                  </p>
                  {destinationChanged && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      A tratativa foi alterada:{' '}
                      <strong>{ITEM_DESTINATION_LABELS[pending?.item?.destination]}</strong> →{' '}
                      <strong>{ITEM_DESTINATION_LABELS[destination]}</strong>. Informe o motivo da
                      alteração no campo abaixo (obrigatório).
                    </div>
                  )}

                </div>
              </div>
            )}
            {pending?.askReturnNumber && (
              <div className="space-y-2">
                <Label>Número da devolução (opcional)</Label>
                <Input
                  value={returnNumber}
                  onChange={(e) => setReturnNumber(e.target.value)}
                  placeholder="Pode ficar em branco"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>
                {reasonRequired
                  ? 'Motivo da reprovação *'
                  : destinationChanged
                    ? 'Motivo da alteração da tratativa *'
                    : 'Observação'}
              </Label>
              <Textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={3}
                placeholder={
                  reasonRequired || destinationChanged ? 'Descreva o motivo' : 'Opcional'
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button
              disabled={
                actionMutation.isPending ||
                ((reasonRequired || destinationChanged) && !observation.trim()) ||
                (isApproval && !destination)
              }
              onClick={() => actionMutation.mutate(pending)}
            >

              {actionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isApproval
                ? destinationChanged
                  ? 'Alterar tratativa e aprovar'
                  : 'Confirmar tratativa e aprovar'
                : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}