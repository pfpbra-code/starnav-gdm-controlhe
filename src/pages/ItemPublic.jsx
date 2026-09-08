import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Package,
  Ship,
  Hash,
  ClipboardList,
  FileText,
  AlertCircle,
  CheckCircle2,
  Circle,
  Dot,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ITEM_DESTINATION_LABELS,
  ITEM_DESTINATION_COLORS,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  ITEM_ACTION_LABELS,
  itemFlow,
  nextActionText,
} from '@/lib/gdmItems';

const fmtDate = (d) => (d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '-');
const fmtDateTime = (d) =>
  d ? format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-';

// Consulta pública de um item de GDM (QR Code) — não exige login.
export default function ItemPublic() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['publicGdmItem', id],
    queryFn: () =>
      base44.functions.invoke('getPublicGdmItem', { item_id: id }).then((res) => res.data),
    enabled: !!id,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data || data.error || !data.item) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="border-0 shadow-sm max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">
              {data?.error || error?.message || 'Equipamento não encontrado'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Verifique o link ou o QR Code utilizado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { item, gdm, history } = data;
  const steps = itemFlow(item);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-sky-600 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-tight">Starnav Control Tower</p>
              <p className="text-xs text-slate-500 leading-tight">Consulta de equipamento</p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <a href="/Dashboard">
              <ExternalLink className="h-4 w-4 mr-2" />
              Acessar o sistema
            </a>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Consulta pública somente leitura. Para registrar ações no processo, faça login com o
          seu perfil de acesso.
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{item.equipment_name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            GDM {gdm?.gdm_number || '-'} • Item {String(item.item_number).padStart(2, '0')}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full border ${ITEM_DESTINATION_COLORS[item.destination] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
            >
              {ITEM_DESTINATION_LABELS[item.destination] || item.destination}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full ${ITEM_STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700'}`}
            >
              {ITEM_STATUS_LABELS[item.status] || item.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Última atualização: {fmtDateTime(item.updated_date)}
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Dados do equipamento</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoRow icon={Package} label="Código" value={item.equipment_code} />
            <InfoRow icon={Hash} label="Número de série" value={item.serial_number} />
            <InfoRow icon={ClipboardList} label="OS" value={item.os_number} />
            <InfoRow icon={Package} label="Quantidade" value={item.quantity} />
            <InfoRow icon={Ship} label="Embarcação" value={gdm?.vessel_name} />
            <InfoRow icon={FileText} label="Fornecedor" value={item.supplier_name} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Andamento do processo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              {nextActionText(item)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Datas e controles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DateLine label="Desembarque" value={fmtDate(gdm?.disembark_date)} />
            <DateLine label="Recebido no almoxarifado" value={fmtDateTime(item.stock_received_at)} />
            <DateLine label="Envio ao fornecedor" value={fmtDate(gdm?.sent_to_supplier_date)} />
            <DateLine label="Retorno previsto" value={fmtDate(gdm?.expected_return_date)} />
            <DateLine label="Retorno do equipamento" value={fmtDate(gdm?.return_date)} />
            {item.destination === 'stock_return' && (
              <>
                <DateLine label="Devolução ao estoque" value={fmtDateTime(item.stock_return_at)} />
                <DateLine label="Número da devolução" value={item.stock_return_number || '-'} />
              </>
            )}
            {item.destination === 'discard' && (
              <>
                <DateLine label="Descarte autorizado" value={fmtDateTime(item.discard_authorized_at)} />
                <DateLine label="Descarte confirmado" value={fmtDateTime(item.discard_confirmed_at)} />
              </>
            )}
            <DateLine label="Finalizado em" value={fmtDateTime(item.completed_at)} />
            <DateLine
              label="PWT / OC / OT"
              value={[gdm?.pwt_number, gdm?.oc_number, gdm?.ot_number].filter(Boolean).join(' / ') || '-'}
            />
          </CardContent>
        </Card>

        {(item.notes || gdm?.description) && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Descrição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              {item.notes && <p>{item.notes}</p>}
              {gdm?.description && <p className="text-slate-500">{gdm.description}</p>}
            </CardContent>
          </Card>
        )}

        {Array.isArray(gdm?.photos) && gdm.photos.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Registro fotográfico</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gdm.photos.map((p, i) => (
                <a key={i} href={p} target="_blank" rel="noopener noreferrer">
                  <img
                    src={p}
                    alt={`Foto ${i + 1} do material`}
                    loading="lazy"
                    className="rounded-lg border border-slate-200 object-cover w-full h-28"
                  />
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Histórico do equipamento</CardTitle>
          </CardHeader>
          <CardContent>
            {history && history.length > 0 ? (
              <ol className="relative border-l border-slate-200 ml-3 space-y-4">
                {history.map((h) => (
                  <li key={h.id} className="ml-4">
                    <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-sky-500 border-2 border-white" />
                    <p className="text-sm font-medium text-slate-800">
                      {ITEM_ACTION_LABELS[h.action] || h.action}
                    </p>
                    <p className="text-xs text-slate-400">{fmtDateTime(h.created_date)}</p>
                    {(h.previous_status || h.new_status) && (
                      <p className="text-xs text-slate-500">
                        {ITEM_STATUS_LABELS[h.previous_status] || '—'} →{' '}
                        {ITEM_STATUS_LABELS[h.new_status] || '—'}
                      </p>
                    )}
                    {h.observation && (
                      <p className="text-sm text-slate-600 mt-1">{h.observation}</p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-400">Sem movimentações registradas.</p>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 pt-2">
          Informações públicas do equipamento. Dados sensíveis são restritos a usuários
          autorizados.
        </p>
      </main>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-medium text-slate-900 break-words">
          {value === 0 || value ? value : '-'}
        </p>
      </div>
    </div>
  );
}

function DateLine({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}