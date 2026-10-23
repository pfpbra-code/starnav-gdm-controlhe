// Solicitação de Emissão de NF — preenchimento automático a partir dos dados
// da GDM/item/fornecedor, auditoria de alterações manuais e geração de arquivo
// (planilha Excel, PDF e impressão).
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { displayNameOf } from '@/lib/displayName';
import { ITEM_DESTINATION_LABELS } from '@/lib/gdmItems';

// Campos auditáveis do formulário (exibidos e registrados nas alterações).
export const NF_FIELD_LABELS = {
  gdm_number: 'Número da GDM',
  request_number: 'Nº da Solicitação',
  vessel_name: 'Embarcação',
  shipment_objective: 'Objetivo da Remessa',
  destination: 'Destino do Equipamento',
  supplier_company_name: 'Razão Social',
  supplier_cnpj: 'CNPJ',
  supplier_state_registration: 'Insc. Estadual',
  supplier_address: 'Endereço',
  supplier_city: 'Cidade',
  supplier_state: 'Estado',
  supplier_zip: 'CEP',
  supplier_phone: 'Telefone',
  carrier: 'Transportadora',
  freight_type: 'Frete',
  freight_paid_by: 'Frete Pago Por',
  operation_type: 'Tipo de Operação',
  operation_nature: 'Natureza da Operação',
  cfop: 'CFOP',
  observations: 'Observações',
  material_will_return: 'Material irá retornar?',
};

// Opções fixas de Natureza da Operação (seleção em lista).
export const NF_OPERATION_NATURE_OPTIONS = [
  'CONSERTO',
  'INDUSTRIALIZAÇÃO',
  'VENDAS',
  'REMESSA P/ ARMAZENAGEM',
  'DEVOLUÇÃO DE MATERIAL',
  'SAÍDA DE ATIVO DE EMPREITEIRA',
];

const OBJECTIVE_BY_DESTINATION = {
  repair: 'Envio de equipamento para reparo',
  certification: 'Envio de equipamento para calibração/certificação',
};

/** Valor monetário no padrão brasileiro: R$ 1.200,00. */
export function fmtNfMoney(value) {
  const n = Number(value) || 0;
  return `R$ ${n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Total da nota fiscal: soma de quantidade × valor unitário dos itens. */
export function nfTotalValue(request) {
  const items = Array.isArray(request?.nf_items) ? request.nf_items : [];
  return items.reduce(
    (sum, it) => sum + (Number(it?.quantity) || 0) * (Number(it?.unit_value) || 0),
    0,
  );
}

/** Data/hora exibida em formulários, arquivos e auditoria. */
export function fmtNfDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd/MM/yyyy HH:mm');
}

/**
 * Separa o endereço único do cadastro do fornecedor em logradouro, cidade,
 * estado (UF) e CEP — melhor esforço; os campos permanecem editáveis.
 */
export function parseSupplierAddress(address = '') {
  const result = { street: address || '', city: '', state: '', zip: '' };
  if (!address) return result;

  const zipMatch = address.match(/(\d{5})-?(\d{3})/);
  if (zipMatch) result.zip = `${zipMatch[1]}-${zipMatch[2]}`;

  let rest = address.replace(/\d{5}-?\d{3}/, '').trim();
  const ufMatches = rest.match(/(?:^|[\s,\-/])([A-Z]{2})(?=$|[\s,\-/])/g) || [];
  if (ufMatches.length) {
    const uf = ufMatches[ufMatches.length - 1].replace(/^[\s,\-/]+/, '');
    result.state = uf;
    const idx = rest.lastIndexOf(uf);
    const before = rest.slice(0, idx).trim().replace(/[\s,\-/]+$/, '');
    const cityMatch = before.match(/(?:^|[,\/\-])\s*([^,\/\-]+)$/);
    if (cityMatch) result.city = cityMatch[1].trim();
    result.street = before
      .replace(new RegExp(`${result.city}$`), '')
      .replace(/[\s,\-/]+$/, '') || address;
  }
  return result;
}

/** Formulário auto-preenchido a partir do item, da GDM e do fornecedor. */
export function buildNfAutoForm({ item, gdm, supplier, user }) {
  const address = parseSupplierAddress(supplier?.address || '');
  return {
    gdm_number: gdm?.gdm_number || '',
    request_number: '',
    vessel_name: item?.vessel_name || gdm?.vessel_name || '',
    request_date: new Date().toISOString(),
    requested_by: user?.email || '',
    requester_name: displayNameOf(user) || '',
    shipment_objective: OBJECTIVE_BY_DESTINATION[item?.destination] || '',
    destination: ITEM_DESTINATION_LABELS[item?.destination] || item?.destination || '',
    supplier_company_name: supplier?.company_name || item?.supplier_name || '',
    supplier_cnpj: supplier?.cnpj || '',
    supplier_state_registration: '',
    supplier_address: address.street,
    supplier_city: address.city,
    supplier_state: address.state,
    supplier_zip: address.zip,
    supplier_phone: supplier?.phone || '',
    nf_items: [
      {
        code: item?.equipment_code || '',
        name: item?.equipment_name || '',
        serial_number: item?.serial_number || '',
        quantity: item?.quantity || 1,
        unit: 'UN',
        unit_value: 0,
        description: '',
      },
    ],
    carrier: '',
    freight_type: '',
    freight_paid_by: 'STARNAV',
    material_will_return: true,
    operation_type: 'Saída',
    operation_nature: 'CONSERTO',
    cfop: '',
    observations: '',
  };
}

/** Formulário a partir de uma solicitação já salva. */
export function formFromNfRequest(record = {}) {
  return {
    gdm_number: record.gdm_number || '',
    request_number: record.request_number || '',
    vessel_name: record.vessel_name || '',
    request_date: record.request_date || '',
    requested_by: record.requested_by || '',
    requester_name: record.requester_name || '',
    shipment_objective: record.shipment_objective || '',
    destination: record.destination || '',
    supplier_company_name: record.supplier_company_name || '',
    supplier_cnpj: record.supplier_cnpj || '',
    supplier_state_registration: record.supplier_state_registration || '',
    supplier_address: record.supplier_address || '',
    supplier_city: record.supplier_city || '',
    supplier_state: record.supplier_state || '',
    supplier_zip: record.supplier_zip || '',
    supplier_phone: record.supplier_phone || '',
    nf_items: Array.isArray(record.nf_items) ? record.nf_items : [],
    carrier: record.carrier || '',
    freight_type: record.freight_type || '',
    freight_paid_by: record.freight_paid_by || '',
    material_will_return: record.material_will_return !== false,
    operation_type: record.operation_type || '',
    operation_nature: record.operation_nature || '',
    cfop: record.cfop || '',
    observations: record.observations || '',
  };
}

/**
 * Compara o formulário atual com os valores anteriores (preenchimento
 * automático ou última versão salva) e devolve as entradas de auditoria:
 * campo, valor anterior, novo valor, usuário e data/hora.
 */
function fmtDiffValue(field, value) {
  if (field === 'material_will_return') return value ? 'SIM' : 'NÃO';
  return String(value ?? '');
}

export function diffNfChanges(previous, next, user) {
  const changes = [];
  Object.keys(NF_FIELD_LABELS).forEach((field) => {
    const before = previous?.[field];
    const after = next?.[field];
    if (fmtDiffValue(field, before) !== fmtDiffValue(field, after)) {
      changes.push({
        field,
        field_label: NF_FIELD_LABELS[field],
        previous_value: fmtDiffValue(field, before),
        new_value: fmtDiffValue(field, after),
      });
    }
  });
  const prevItems = Array.isArray(previous?.nf_items) ? previous.nf_items : [];
  const nextItems = Array.isArray(next?.nf_items) ? next.nf_items : [];
  if (JSON.stringify(prevItems) !== JSON.stringify(nextItems)) {
    changes.push({
      field: 'nf_items',
      field_label: 'Itens da NF',
      previous_value: `${prevItems.length} item(ns)`,
      new_value: `${nextItems.length} item(ns)`,
    });
  }
  return changes.map((c) => ({
    ...c,
    changed_by: user?.email || '',
    changed_by_name: displayNameOf(user) || '',
    changed_at: new Date().toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Geração de arquivos (planilha Excel, PDF e impressão)
// ---------------------------------------------------------------------------

/** Seções [título, [[campo, valor], ...]] do formulário padrão da NF. */
export function nfFormSections(request) {
  const items = Array.isArray(request.nf_items) ? request.nf_items : [];
  const audit = Array.isArray(request.audit_changes) ? request.audit_changes : [];
  const sections = [
    [
      'DADOS DA GDM',
      [
        ['Número da GDM', request.gdm_number],
        ['Nº da Solicitação', request.request_number],
        ['Embarcação', request.vessel_name],
        ['Data da Solicitação', fmtNfDateTime(request.request_date)],
        ['Usuário Solicitante', request.requester_name],
        ['Objetivo da Remessa', request.shipment_objective],
        ['Destino do Equipamento', request.destination],
      ],
    ],
    [
      'DADOS DO FORNECEDOR',
      [
        ['Razão Social', request.supplier_company_name],
        ['CNPJ', request.supplier_cnpj],
        ['Insc. Estadual', request.supplier_state_registration],
        ['Endereço', request.supplier_address],
        ['Cidade', request.supplier_city],
        ['Estado', request.supplier_state],
        ['CEP', request.supplier_zip],
        ['Telefone', request.supplier_phone],
      ],
    ],
    ...items.map((it, idx) => [
      `EQUIPAMENTO - ITEM ${idx + 1}`,
      [
        ['Código', it.code],
        ['Equipamento', it.name],
        ['Número de Série (SN)', it.serial_number],
        ['Quantidade', it.quantity],
        ['Unidade', it.unit],
        ['Descrição', it.description],
        ['Valor Unitário', fmtNfMoney(it.unit_value)],
        [
          'Valor Total',
          fmtNfMoney((Number(it.quantity) || 0) * (Number(it.unit_value) || 0)),
        ],
      ],
    ]),
    [
      'DADOS LOGÍSTICOS',
      [
        ['Transportadora', request.carrier],
        ['Frete', request.freight_type],
        ['Frete Pago Por', request.freight_paid_by],
        ['Tipo de Operação', request.operation_type],
        ['Natureza da Operação', request.operation_nature],
        ['CFOP', request.cfop],
      ],
    ],
    [
      'OBSERVAÇÕES',
      [
        ['Observações', request.observations],
        ['Material irá retornar?', request.material_will_return ? 'SIM' : 'NÃO'],
        ['TOTAL DA NOTA FISCAL', fmtNfMoney(nfTotalValue(request))],
      ],
    ],
  ];
  if (audit.length) {
    sections.push([
      'AUDITORIA DE ALTERAÇÕES',
      audit.map((c) => [
        c.field_label || c.field,
        `Anterior: ${c.previous_value || '—'} | Novo: ${c.new_value || '—'} | Usuário: ${
          c.changed_by_name || c.changed_by || '—'
        } | Data: ${fmtNfDateTime(c.changed_at)}`,
      ]),
    ]);
  }
  return sections;
}

function nfFilename(request, ext) {
  const gdm = String(request.gdm_number || 'GDM').replace(/[^\w-]+/g, '-');
  return `solicitacao-nf-${gdm}-${format(new Date(), 'yyyy-MM-dd')}.${ext}`;
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Download da solicitação em planilha Excel (SpreadsheetML) reproduzindo o
 * layout padrão do formulário: cabeçalho com rótulos em cinza, tabela de
 * itens (Código, Qtde, Unidade, Descrição, Valor Unit, Valor Total), linha
 * destacada em vermelho e rodapé com observações, retorno, total e solicitante.
 */
export function exportNfSpreadsheet(request) {
  const items = Array.isArray(request.nf_items) ? request.nf_items : [];
  const rowCount = Math.max(items.length, 8);
  const emissionDate = request.request_date
    ? format(new Date(request.request_date), 'dd/MM/yyyy')
    : '';

  const rows = [];
  const addRow = (...cells) => rows.push(`<Row>${cells.join('')}</Row>`);
  const cell = (col, value, style, merge) => {
    const attrs = [`ss:Index="${col}"`];
    if (merge) attrs.push(`ss:MergeAcross="${merge}"`);
    if (style) attrs.push(`ss:StyleID="${style}"`);
    return `<Cell ${attrs.join(' ')}><Data ss:Type="String">${xmlEscape(
      value ?? '',
    )}</Data></Cell>`;
  };

  // Cabeçalho — rótulos em cinza à esquerda, dados preenchidos ao lado.
  addRow(
    cell(1, 'Nº SOLICITAÇÃO', 'label'),
    cell(2, request.request_number || ''),
    cell(3, 'DATA PARA EMISSÃO', 'label'),
    cell(4, emissionDate),
  );
  addRow(
    cell(1, 'OBJETIVO', 'label'),
    cell(2, request.shipment_objective || ''),
    cell(3, 'NATUREZA DE OPERAÇÃO', 'label'),
    cell(4, request.operation_nature || ''),
  );
  addRow(
    cell(1, 'CFOP', 'label'),
    cell(2, request.cfop || ''),
    cell(3, 'FRETE', 'label'),
    cell(4, request.freight_type || ''),
  );
  addRow(cell(1, 'EMPRESA DESTINO', 'label'), cell(2, request.supplier_company_name || '', '', 2));
  addRow(cell(1, 'ENDEREÇO', 'label'), cell(2, request.supplier_address || '', '', 2));
  addRow(
    cell(1, 'CEP', 'label'),
    cell(2, request.supplier_zip || ''),
    cell(3, 'CNPJ', 'label'),
    cell(4, request.supplier_cnpj || ''),
  );
  addRow(
    cell(1, 'INSC. ESTADUAL', 'label'),
    cell(2, request.supplier_state_registration || ''),
    cell(3, 'FONE', 'label'),
    cell(4, request.supplier_phone || ''),
  );
  addRow(
    cell(1, 'CIDADE', 'label'),
    cell(2, [request.supplier_city, request.supplier_state].filter(Boolean).join(' - ')),
    cell(3, 'TRANSPORTADORA', 'label'),
    cell(4, request.carrier || ''),
  );
  addRow(cell(1, 'FRETE PAGO POR', 'label'), cell(2, request.freight_paid_by || ''));
  addRow();

  // Tabela de itens.
  addRow(
    cell(1, 'CÓDIGO', 'headerRow'),
    cell(2, 'QTDADE', 'headerRow'),
    cell(3, 'UNIDADE', 'headerRow'),
    cell(4, 'DESCRIÇÃO DA MERCADORIA', 'headerRow'),
    cell(5, 'VALOR UNIT', 'headerRow'),
    cell(6, 'VALOR TOTAL', 'headerRow'),
  );
  for (let i = 0; i < rowCount; i++) {
    const it = items[i] || {};
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.unit_value) || 0;
    const description = [it.name, it.serial_number ? `SN: ${it.serial_number}` : '', it.description]
      .filter(Boolean)
      .join(' - ');
    addRow(
      cell(1, it.code || ''),
      cell(2, qty),
      cell(3, it.unit || ''),
      cell(4, description),
      cell(5, fmtNfMoney(unit), 'money'),
      cell(6, fmtNfMoney(qty * unit), 'money'),
    );
  }
  addRow(cell(1, `${request.supplier_company_name || ''} - STARNAV`, 'redCenter', 5));
  addRow();

  // Rodapé.
  addRow(cell(1, 'OBS:', 'label'), cell(2, request.observations || '', '', 4));
  addRow(
    cell(1, 'VOLUME O MATERIAL IRÁ RETORNAR?', 'label', 1),
    cell(3, request.material_will_return ? 'SIM' : 'NÃO', 'bold'),
  );
  addRow(
    cell(1, 'TOTAL DA NOTA FISCAL', 'label', 1),
    cell(6, fmtNfMoney(nfTotalValue(request)), 'totalRow'),
  );
  addRow(
    cell(1, 'SOLICITANTE EMISSÃO NF', 'label', 1),
    cell(3, request.requester_name || ''),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="label"><Font ss:Bold="1"/><Interior ss:Color="#D9D9D9" ss:Pattern="Solid"/></Style>
  <Style ss:ID="headerRow"><Font ss:Bold="1"/><Interior ss:Color="#D9D9D9" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="bold"><Font ss:Bold="1"/></Style>
  <Style ss:ID="money"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="redCenter"><Font ss:Color="#FF0000" ss:Bold="1"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="totalRow"><Font ss:Bold="1" ss:Size="14"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
 </Styles>
 <Worksheet ss:Name="Solicitação NF">
  <Table>
   <Column ss:AutoFitWidth="0" ss:Width="210"/>
   <Column ss:AutoFitWidth="0" ss:Width="120"/>
   <Column ss:AutoFitWidth="0" ss:Width="180"/>
   <Column ss:AutoFitWidth="0" ss:Width="150"/>
   <Column ss:AutoFitWidth="0" ss:Width="100"/>
   <Column ss:AutoFitWidth="0" ss:Width="110"/>
   ${rows.join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nfFilename(request, 'xls');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Download da solicitação em PDF, seguindo o layout padrão do formulário. */
export function exportNfPdf(request) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 18;

  const ensure = (h) => {
    if (y + h > pageH - 16) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SOLICITAÇÃO DE EMISSÃO DE NOTA FISCAL', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Gerada em ${fmtNfDateTime(new Date().toISOString())} por ${request.requester_name || '—'}`,
    14,
    y,
  );
  y += 8;

  nfFormSections(request).forEach(([title, rows]) => {
    ensure(14);
    doc.setFillColor(230, 242, 250);
    doc.rect(14, y - 4, pageW - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, 15, y);
    y += 10;
    rows.forEach(([label, value]) => {
      const valueLines = doc.splitTextToSize(String(value ?? '—'), pageW - 96);
      ensure(Math.max(6, valueLines.length * 5));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(String(label), 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text(valueLines, 92, y);
      y += Math.max(6, valueLines.length * 5);
    });
    y += 4;
  });

  doc.save(nfFilename(request, 'pdf'));
}

/** Abre a versão para impressão da solicitação. Retorna false se o navegador bloquear. */
export function printNfRequest(request) {
  const rows = nfFormSections(request)
    .map(
      ([title, entries]) => `
      <tr><td colspan="2" class="section">${title}</td></tr>
      ${entries
        .map(
          ([label, value]) =>
            `<tr><td class="label">${label}</td><td>${value ?? '—'}</td></tr>`,
        )
        .join('')}`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Solicitação de Emissão de NF - ${request.gdm_number || ''}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #0a0a0a; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  p.sub { font-size: 11px; color: #737373; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  td { border: 1px solid #e5e5e5; padding: 6px 8px; vertical-align: top; }
  td.section { background: #e6f2fa; font-weight: bold; font-size: 12px; }
  td.label { width: 240px; font-weight: bold; background: #fafafa; }
</style>
</head>
<body>
<h1>SOLICITAÇÃO DE EMISSÃO DE NOTA FISCAL</h1>
<p class="sub">Starnav Serviços de Reparo (GDM)</p>
<table>${rows}</table>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  return true;
}