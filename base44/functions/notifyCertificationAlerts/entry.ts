import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ALERTAS DE VENCIMENTO DE CERTIFICAÇÃO/CALIBRAÇÃO — executado diariamente pelo
// workflow "Alertas de Certificações".
// Marcos notificados (um por certificado): 90, 60, 30, 15 dias, o dia do
// vencimento e a certificação vencida. Cada marco é notificado uma única vez
// (registro em alerts_sent). Destinatários: setor de Operações e Administradores.

const MILESTONES = [90, 60, 30, 15, 0];
const DAY_MS = 86400000;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    const certs = await base44.asServiceRole.entities.Certification.list('-created_date', 1000);

    // Apenas o certificado mais recente de cada item é monitorado (o histórico
    // anterior permanece registrado apenas para consulta).
    const latestByItem: Record<string, any> = {};
    (certs || []).forEach((c: any) => {
      const cur = latestByItem[c.item_id];
      if (!cur || new Date(c.created_date) > new Date(cur.created_date)) {
        latestByItem[c.item_id] = c;
      }
    });
    const monitored = Object.values(latestByItem).filter((c: any) => !!c.expires_at);
    if (monitored.length === 0) {
      return Response.json({ notified: 0, message: 'Nenhuma certificação com validade para monitorar' });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const targets = (users || []).filter(
      (u: any) =>
        u.role === 'admin' ||
        (Array.isArray(u.sectors) ? u.sectors : u.data?.sectors || []).includes('operations')
    );
    if (targets.length === 0) {
      return Response.json({ notified: 0, message: 'Nenhum destinatário (Operações/Admin) para notificar' });
    }

    let notified = 0;
    for (const cert of monitored) {
      const sent: string[] = Array.isArray(cert.alerts_sent) ? cert.alerts_sent : [];
      const daysLeft = Math.ceil((new Date(cert.expires_at).getTime() - now.getTime()) / DAY_MS);

      // Marco a notificar: vencida, ou o marco mais próximo já atingido
      // (cada marco é notificado uma única vez por certificado).
      let milestone: string | null = null;
      if (daysLeft < 0) {
        if (!sent.includes('expired')) milestone = 'expired';
      } else {
        for (const m of [...MILESTONES].reverse()) {
          if (daysLeft <= m && !sent.includes(String(m))) {
            milestone = String(m);
            break;
          }
        }
      }
      if (!milestone) continue;

      const expired = milestone === 'expired';
      const expiresDate = String(cert.expires_at).slice(0, 10);
      const title = expired
        ? 'Certificação vencida'
        : daysLeft === 0
          ? 'Certificação vence hoje'
          : `Certificação vence em ${daysLeft} dias`;
      const priority = expired ? 'critical' : daysLeft <= 30 ? 'high' : 'medium';
      const message = `SN ${cert.serial_number || '—'} (${cert.equipment_name || 'equipamento'}) — certificado ${cert.certificate_number || '—'} da empresa ${cert.certifying_company || '—'}: ${expired ? 'venceu' : 'vence'} em ${expiresDate}.`;

      for (const u of targets) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: u.id,
          user_email: u.email,
          type: 'system_alert',
          title,
          message,
          priority,
          link: '/Operations',
          link_text: 'Abrir Gestão de Certificações',
          related_entity_type: 'Certification',
          related_entity_id: cert.id,
          metadata: { sn: cert.serial_number, milestone, expires_at: cert.expires_at },
        });
        notified++;
      }

      await base44.asServiceRole.entities.Certification.update(cert.id, {
        alerts_sent: [...sent, milestone],
      });
    }

    return Response.json({ notified, monitored: monitored.length });
  } catch (error) {
    return Response.json({ error: error?.message || 'Falha no alerta de certificações' }, { status: 500 });
  }
}