import { Platform } from 'react-native';

const LOGO_CHAR = 'ESSĒRE';

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 24px; font-size: 13px; line-height: 1.5; }
  .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #D40000; padding-bottom: 16px; }
  .header h1 { font-size: 22px; color: #D40000; letter-spacing: 2px; margin-bottom: 4px; }
  .header .subtitle { font-size: 14px; color: #666; }
  .header .period { font-size: 12px; color: #999; margin-top: 4px; }
  h2 { font-size: 16px; color: #D40000; margin: 20px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  h3 { font-size: 14px; color: #333; margin: 14px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
  th { background: #f5f5f5; text-align: left; padding: 8px 10px; border: 1px solid #ddd; font-weight: 700; }
  td { padding: 6px 10px; border: 1px solid #ddd; }
  tr:nth-child(even) { background: #fafafa; }
  .summary-row { background: #f0f0f0 !important; font-weight: 700; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge-success { background: #d4edda; color: #155724; }
  .badge-warning { background: #fff3cd; color: #856404; }
  .badge-danger { background: #f8d7da; color: #721c24; }
  .badge-info { background: #cce5ff; color: #004085; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .stat-card { background: #f8f8f8; border: 1px solid #eee; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-value { font-size: 20px; font-weight: 700; color: #1a1a1a; }
  .stat-label { font-size: 11px; color: #888; margin-top: 4px; }
  .progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin: 4px 0 8px; }
  .progress-fill { height: 100%; border-radius: 4px; }
  .text-success { color: #28a745; }
  .text-danger { color: #dc3545; }
  .text-right { text-align: right; }
  .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
  .exercise-card { border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
  .exercise-num { display: inline-block; width: 24px; height: 24px; background: #D40000; color: #fff; text-align: center; line-height: 24px; border-radius: 50%; font-size: 12px; font-weight: 700; margin-right: 8px; }
  .exercise-name { font-weight: 700; font-size: 13px; }
  .exercise-details { font-size: 12px; color: #666; margin-top: 4px; }
  .day-section { margin-bottom: 16px; page-break-inside: avoid; }
  .day-title { font-size: 14px; font-weight: 700; background: #f0f0f0; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; }
  @media print { body { padding: 12px; } .no-print { display: none; } }
`;

function openPrintWindow(title: string, bodyHtml: string, subtitle?: string, period?: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const periodHtml = period ? `<div class="period">${period}</div>` : '';
  const subtitleHtml = subtitle ? `<div class="subtitle">${subtitle}</div>` : '';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} - ${LOGO_CHAR}</title><style>${BASE_CSS}</style></head><body>
    <div class="header"><h1>${LOGO_CHAR}</h1>${subtitleHtml}${periodHtml}</div>
    ${bodyHtml}
    <div class="footer">Generato da ${LOGO_CHAR} il ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
  </body></html>`;
  showPrintOverlay(html);
}

function showPrintOverlay(html: string) {
  const existing = document.getElementById('print-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'print-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#fff;display:flex;flex-direction:column;';

  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 16px;background:#0D0D0D;flex-shrink:0;';

  const printBtn = document.createElement('button');
  printBtn.textContent = 'Stampa / Salva PDF';
  printBtn.style.cssText = 'background:#D40000;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Chiudi';
  closeBtn.style.cssText = 'background:#333;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;';

  toolbar.appendChild(printBtn);
  toolbar.appendChild(closeBtn);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'flex:1;border:none;width:100%;';

  overlay.appendChild(toolbar);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  }

  printBtn.onclick = () => {
    if (iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  closeBtn.onclick = () => {
    overlay.remove();
  };
}

const fmtDate = (d: unknown): string => {
  if (!d) return '-';
  let date: Date;
  if (d instanceof Date) date = d;
  else if (d && typeof d === 'object' && 'toDate' in d) date = (d as any).toDate();
  else if (d && typeof d === 'object' && 'seconds' in d) date = new Date((d as any).seconds * 1000);
  else date = new Date(d as string);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('it-IT');
};

const fmtCurrency = (n: number) => `€${n.toFixed(2)}`;

const statusBadge = (status: string) => {
  const map: Record<string, [string, string]> = {
    paid: ['badge-success', 'Pagato'],
    pending: ['badge-warning', 'In attesa'],
    overdue: ['badge-danger', 'Scaduta'],
    completed: ['badge-success', 'Completata'],
    cancelled_late: ['badge-danger', 'Cancellazione tardiva'],
    cancelled_by_student: ['badge-warning', 'Cancellata'],
    scheduled: ['badge-info', 'Programmata'],
    no_show: ['badge-danger', 'No-show'],
  };
  const [cls, label] = map[status] || ['badge-info', status];
  return `<span class="badge ${cls}">${label}</span>`;
};

// ─── 1. Student payment plan detail ────────────────────────────────────

interface PrintPlanDetailParams {
  studentName: string;
  plan: any;
  sessions: any[];
  transactions: any[];
}

export function printPlanDetail({ studentName, plan, sessions, transactions }: PrintPlanDetailParams) {
  const usedL = plan.usedLessons ?? 0;
  const inclL = plan.includedLessons ?? 0;
  const usedC = plan.usedConsultations ?? 0;
  const inclC = plan.includedConsultations ?? 0;
  const pctL = inclL > 0 ? Math.min((usedL / inclL) * 100, 100) : 0;
  const pctC = inclC > 0 ? Math.min((usedC / inclC) * 100, 100) : 0;

  let html = `<h2>Percorso di ${studentName}</h2>`;
  html += `<div class="stat-grid">
    <div class="stat-card"><div class="stat-value">${fmtCurrency(plan.totalAmount)}</div><div class="stat-label">Importo totale</div></div>
    <div class="stat-card"><div class="stat-value">${fmtDate(plan.startDate)}</div><div class="stat-label">Inizio</div></div>
    <div class="stat-card"><div class="stat-value">${fmtDate(plan.endDate)}</div><div class="stat-label">Fine</div></div>
  </div>`;

  if (inclL > 0) {
    html += `<h3>Lezioni: ${usedL} / ${inclL}</h3>
    <div class="progress-bar"><div class="progress-fill" style="width:${pctL}%;background:#007bff"></div></div>`;
  }
  if (inclC > 0) {
    html += `<h3>Consulenze: ${usedC} / ${inclC}</h3>
    <div class="progress-bar"><div class="progress-fill" style="width:${pctC}%;background:#ffc107"></div></div>`;
  }

  // Sessions
  html += `<h2>Lezioni completate (${sessions.length})</h2>`;
  if (sessions.length > 0) {
    html += `<table><tr><th>Data</th><th>Orario</th><th>Stato</th><th>Costo</th><th>Note</th></tr>`;
    for (const s of sessions) {
      html += `<tr><td>${fmtDate(s.date)}</td><td>${s.startTime || ''} - ${s.endTime || ''}</td><td>${statusBadge(s.status)}</td><td>${s.sessionCost ? fmtCurrency(s.sessionCost) : '-'}</td><td>${s.notes || ''}</td></tr>`;
    }
    html += `</table>`;
  } else {
    html += `<p>Nessuna lezione completata nel periodo.</p>`;
  }

  // Installments
  html += `<h2>Rate (${plan.installments?.length || 0})</h2>`;
  if (plan.installments?.length > 0) {
    html += `<table><tr><th>N°</th><th>Importo</th><th>Scadenza</th><th>Stato</th><th>Data pagamento</th></tr>`;
    plan.installments.forEach((inst: any, i: number) => {
      html += `<tr><td>${i + 1}</td><td>${fmtCurrency(inst.amount)}</td><td>${fmtDate(inst.dueDate)}</td><td>${statusBadge(inst.status)}</td><td>${inst.paidDate ? fmtDate(inst.paidDate) : '-'}</td></tr>`;
    });
    html += `</table>`;
  }

  // Transactions
  html += `<h2>Movimenti economici (${transactions.length})</h2>`;
  if (transactions.length > 0) {
    html += `<table><tr><th>Data</th><th>Tipo</th><th>Importo</th><th>Descrizione</th></tr>`;
    let total = 0;
    for (const t of transactions) {
      const sign = t.type === 'income' ? '+' : '-';
      total += t.type === 'income' ? t.amount : -t.amount;
      html += `<tr><td>${fmtDate(t.date)}</td><td>${t.type === 'income' ? 'Ricavo' : 'Spesa'}</td><td class="${t.type === 'income' ? 'text-success' : 'text-danger'}">${sign}${fmtCurrency(t.amount)}</td><td>${t.description || t.category || ''}</td></tr>`;
    }
    html += `<tr class="summary-row"><td colspan="2">Totale netto</td><td class="${total >= 0 ? 'text-success' : 'text-danger'}" colspan="2">${total >= 0 ? '+' : ''}${fmtCurrency(total)}</td></tr></table>`;
  } else {
    html += `<p>Nessun movimento registrato nel periodo.</p>`;
  }

  openPrintWindow(`Percorso ${studentName}`, html, `Percorso di ${studentName}`, `${fmtDate(plan.startDate)} – ${fmtDate(plan.endDate)}`);
}

// ─── 2. Financial report for accountant ────────────────────────────────

interface PrintFinancialReportParams {
  transactions: any[];
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
}

export function printFinancialReport({ transactions, startDate, endDate, totalIncome, totalExpenses }: PrintFinancialReportParams) {
  const profit = totalIncome - totalExpenses;
  let html = `<div class="stat-grid">
    <div class="stat-card"><div class="stat-value text-success">${fmtCurrency(totalIncome)}</div><div class="stat-label">Ricavi totali</div></div>
    <div class="stat-card"><div class="stat-value text-danger">${fmtCurrency(totalExpenses)}</div><div class="stat-label">Spese totali</div></div>
    <div class="stat-card"><div class="stat-value ${profit >= 0 ? 'text-success' : 'text-danger'}">${fmtCurrency(profit)}</div><div class="stat-label">Profitto netto</div></div>
  </div>`;

  // Group by category
  const byCategory: Record<string, { income: number; expense: number }> = {};
  for (const t of transactions) {
    const cat = t.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0 };
    if (t.type === 'income') byCategory[cat].income += t.amount;
    else byCategory[cat].expense += t.amount;
  }

  const catLabels: Record<string, string> = {
    student_payment: 'Pagamento allievi', collaborator_payment: 'Pagamento collaboratori',
    rent: 'Affitto', equipment: 'Attrezzatura', marketing: 'Marketing',
    insurance: 'Assicurazione', utilities: 'Utenze', other: 'Altro',
  };

  html += `<h2>Riepilogo per categoria</h2>
  <table><tr><th>Categoria</th><th>Ricavi</th><th>Spese</th><th>Netto</th></tr>`;
  for (const [cat, val] of Object.entries(byCategory)) {
    const net = val.income - val.expense;
    html += `<tr><td>${catLabels[cat] || cat}</td><td class="text-success">${fmtCurrency(val.income)}</td><td class="text-danger">${fmtCurrency(val.expense)}</td><td class="${net >= 0 ? 'text-success' : 'text-danger'}">${fmtCurrency(net)}</td></tr>`;
  }
  html += `<tr class="summary-row"><td>TOTALE</td><td class="text-success">${fmtCurrency(totalIncome)}</td><td class="text-danger">${fmtCurrency(totalExpenses)}</td><td class="${profit >= 0 ? 'text-success' : 'text-danger'}">${fmtCurrency(profit)}</td></tr></table>`;

  // All transactions detail
  html += `<h2>Dettaglio transazioni (${transactions.length})</h2>`;
  if (transactions.length > 0) {
    html += `<table><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrizione</th><th class="text-right">Importo</th></tr>`;
    for (const t of transactions) {
      const sign = t.type === 'income' ? '+' : '-';
      html += `<tr><td>${fmtDate(t.date)}</td><td>${t.type === 'income' ? 'Ricavo' : 'Spesa'}</td><td>${catLabels[t.category] || t.category || ''}</td><td>${t.description || ''}</td><td class="text-right ${t.type === 'income' ? 'text-success' : 'text-danger'}">${sign}${fmtCurrency(t.amount)}</td></tr>`;
    }
    html += `</table>`;
  }

  openPrintWindow('Report Economico', html, 'Report Economico', `${startDate} – ${endDate}`);
}

// ─── 3. Staff sessions + economics ─────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  surname: string;
  role: string;
  commissionPercentage?: number;
  collaboratorType?: string;
}

interface PrintStaffReportParams {
  staff: StaffMember[];
  sessions: any[];
  transactions: any[];
  startDate: string;
  endDate: string;
  students: any[];
}

export function printStaffReport({ staff, sessions, transactions, startDate, endDate, students }: PrintStaffReportParams) {
  const studentMap: Record<string, string> = {};
  for (const s of students) studentMap[s.id] = `${s.name} ${s.surname}`;

  let html = '';

  for (const member of staff) {
    const fullName = `${member.name} ${member.surname}`;
    const roleLabel = member.role === 'manager' ? 'Manager' : member.collaboratorType === 'nutritionist' ? 'Nutrizionista' : 'Coach';
    const memberSessions = sessions.filter((s: any) => s.collaboratorId === member.id);
    const completedSessions = memberSessions.filter((s: any) => s.isCountedAsCompleted || s.status === 'completed');
    const memberTx = transactions.filter((t: any) => t.collaboratorId === member.id);
    const commission = member.commissionPercentage ?? 0;

    html += `<h2>${fullName} <span class="badge badge-info">${roleLabel}</span></h2>`;
    html += `<div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${completedSessions.length}</div><div class="stat-label">Lezioni completate</div></div>
      <div class="stat-card"><div class="stat-value">${commission}%</div><div class="stat-label">Commissione</div></div>`;

    let totalSessionCost = 0;
    for (const s of completedSessions) totalSessionCost += s.sessionCost || 0;
    const staffEarnings = totalSessionCost * (commission / 100);
    const studioEarnings = totalSessionCost - staffEarnings;

    html += `<div class="stat-card"><div class="stat-value">${fmtCurrency(staffEarnings)}</div><div class="stat-label">Guadagno ${roleLabel}</div></div>
      <div class="stat-card"><div class="stat-value">${fmtCurrency(studioEarnings)}</div><div class="stat-label">Versato allo studio</div></div>
    </div>`;

    if (completedSessions.length > 0) {
      html += `<h3>Lezioni</h3><table><tr><th>Data</th><th>Orario</th><th>Allievo</th><th>Stato</th><th>Costo</th><th>Guadagno</th><th>Studio</th></tr>`;
      for (const s of completedSessions) {
        const cost = s.sessionCost || 0;
        const earn = cost * (commission / 100);
        const studio = cost - earn;
        html += `<tr><td>${fmtDate(s.date)}</td><td>${s.startTime || ''} - ${s.endTime || ''}</td><td>${studentMap[s.studentId] || s.studentId}</td><td>${statusBadge(s.status)}</td><td>${fmtCurrency(cost)}</td><td>${fmtCurrency(earn)}</td><td>${fmtCurrency(studio)}</td></tr>`;
      }
      html += `<tr class="summary-row"><td colspan="4">TOTALE</td><td>${fmtCurrency(totalSessionCost)}</td><td>${fmtCurrency(staffEarnings)}</td><td>${fmtCurrency(studioEarnings)}</td></tr></table>`;
    }

    if (memberTx.length > 0) {
      html += `<h3>Movimenti economici</h3><table><tr><th>Data</th><th>Tipo</th><th>Importo</th><th>Descrizione</th></tr>`;
      for (const t of memberTx) {
        const sign = t.type === 'income' ? '+' : '-';
        html += `<tr><td>${fmtDate(t.date)}</td><td>${t.type === 'income' ? 'Ricavo' : 'Spesa'}</td><td class="${t.type === 'income' ? 'text-success' : 'text-danger'}">${sign}${fmtCurrency(t.amount)}</td><td>${t.description || ''}</td></tr>`;
      }
      html += `</table>`;
    }
  }

  openPrintWindow('Report Staff', html, 'Report Lezioni e Economica Staff', `${startDate} – ${endDate}`);
}

// ─── 4. Owner's own sessions + economics ───────────────────────────────

interface PrintOwnerReportParams {
  ownerName: string;
  ownerId: string;
  sessions: any[];
  transactions: any[];
  staff: StaffMember[];
  students: any[];
  startDate: string;
  endDate: string;
}

export function printOwnerReport({ ownerName, ownerId, sessions, transactions, staff, students, startDate, endDate }: PrintOwnerReportParams) {
  const studentMap: Record<string, string> = {};
  for (const s of students) studentMap[s.id] = `${s.name} ${s.surname}`;

  let html = '';

  // Owner's own sessions
  const ownerSessions = sessions.filter((s: any) => s.collaboratorId === ownerId);
  const ownerCompleted = ownerSessions.filter((s: any) => s.isCountedAsCompleted || s.status === 'completed');
  let ownerTotal = 0;
  for (const s of ownerCompleted) ownerTotal += s.sessionCost || 0;

  html += `<h2>Le mie lezioni – ${ownerName}</h2>`;
  html += `<div class="stat-grid">
    <div class="stat-card"><div class="stat-value">${ownerCompleted.length}</div><div class="stat-label">Lezioni completate</div></div>
    <div class="stat-card"><div class="stat-value">${fmtCurrency(ownerTotal)}</div><div class="stat-label">Fatturato lezioni</div></div>
  </div>`;

  if (ownerCompleted.length > 0) {
    html += `<table><tr><th>Data</th><th>Orario</th><th>Allievo</th><th>Costo</th><th>Note</th></tr>`;
    for (const s of ownerCompleted) {
      html += `<tr><td>${fmtDate(s.date)}</td><td>${s.startTime || ''} - ${s.endTime || ''}</td><td>${studentMap[s.studentId] || s.studentId}</td><td>${fmtCurrency(s.sessionCost || 0)}</td><td>${s.notes || ''}</td></tr>`;
    }
    html += `<tr class="summary-row"><td colspan="3">TOTALE</td><td>${fmtCurrency(ownerTotal)}</td><td></td></tr></table>`;
  }

  // Staff summary
  html += `<h2>Riepilogo Staff</h2>`;
  let grandTotalCost = 0, grandStaffEarnings = 0, grandStudioEarnings = 0;

  for (const member of staff) {
    const fullName = `${member.name} ${member.surname}`;
    const roleLabel = member.role === 'manager' ? 'Manager' : member.collaboratorType === 'nutritionist' ? 'Nutrizionista' : 'Coach';
    const memberCompleted = sessions.filter((s: any) => (s.collaboratorId === member.id) && (s.isCountedAsCompleted || s.status === 'completed'));
    const commission = member.commissionPercentage ?? 0;
    let memberCost = 0;
    for (const s of memberCompleted) memberCost += s.sessionCost || 0;
    const staffEarn = memberCost * (commission / 100);
    const studioEarn = memberCost - staffEarn;
    grandTotalCost += memberCost;
    grandStaffEarnings += staffEarn;
    grandStudioEarnings += studioEarn;

    html += `<h3>${fullName} <span class="badge badge-info">${roleLabel} · ${commission}%</span></h3>`;
    if (memberCompleted.length > 0) {
      html += `<table><tr><th>Data</th><th>Orario</th><th>Allievo</th><th>Costo</th><th>Guadagno ${roleLabel}</th><th>Versato studio</th></tr>`;
      for (const s of memberCompleted) {
        const cost = s.sessionCost || 0;
        html += `<tr><td>${fmtDate(s.date)}</td><td>${s.startTime || ''} - ${s.endTime || ''}</td><td>${studentMap[s.studentId] || s.studentId}</td><td>${fmtCurrency(cost)}</td><td>${fmtCurrency(cost * (commission / 100))}</td><td>${fmtCurrency(cost - cost * (commission / 100))}</td></tr>`;
      }
      html += `<tr class="summary-row"><td colspan="3">TOTALE</td><td>${fmtCurrency(memberCost)}</td><td>${fmtCurrency(staffEarn)}</td><td>${fmtCurrency(studioEarn)}</td></tr></table>`;
    } else {
      html += `<p>Nessuna lezione nel periodo.</p>`;
    }
  }

  html += `<h2>Riepilogo Generale Staff</h2>
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-value">${fmtCurrency(grandTotalCost)}</div><div class="stat-label">Fatturato staff totale</div></div>
    <div class="stat-card"><div class="stat-value text-danger">${fmtCurrency(grandStaffEarnings)}</div><div class="stat-label">Pagato allo staff</div></div>
    <div class="stat-card"><div class="stat-value text-success">${fmtCurrency(grandStudioEarnings)}</div><div class="stat-label">Incasso studio</div></div>
  </div>`;

  openPrintWindow('Report Titolare', html, `Report Completo – ${ownerName}`, `${startDate} – ${endDate}`);
}

// ─── 5. Workout program print ──────────────────────────────────────────

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

interface PrintWorkoutPlanParams {
  studentName: string;
  plan: any;
}

export function printWorkoutPlan({ studentName, plan }: PrintWorkoutPlanParams) {
  let html = `<div class="stat-grid">
    <div class="stat-card"><div class="stat-value">${plan.title || 'Programma'}</div><div class="stat-label">Titolo</div></div>
    <div class="stat-card"><div class="stat-value">${fmtDate(plan.startDate)}</div><div class="stat-label">Inizio</div></div>
    <div class="stat-card"><div class="stat-value">${fmtDate(plan.endDate)}</div><div class="stat-label">Fine</div></div>
  </div>`;

  for (let day = 0; day < 7; day++) {
    const dayData = plan.weeklySchedule?.[day];
    const exercises = dayData?.exercises || [];
    html += `<div class="day-section"><div class="day-title">${DAYS[day]}</div>`;
    if (exercises.length === 0) {
      html += `<p style="padding:6px 10px;color:#999">Giorno di riposo</p>`;
    } else {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        html += `<div class="exercise-card"><span class="exercise-num">${i + 1}</span><span class="exercise-name">${ex.name}</span>
          <div class="exercise-details">${ex.sets} serie x ${ex.reps} reps${ex.restSeconds > 0 ? ` · Recupero: ${ex.restSeconds}s` : ''}</div>`;
        if (ex.description) html += `<div class="exercise-details">${ex.description}</div>`;
        if (ex.notes) html += `<div class="exercise-details" style="color:#856404;font-style:italic">Note: ${ex.notes}</div>`;
        html += `</div>`;
      }
    }
    html += `</div>`;
  }

  openPrintWindow(`Programma ${studentName}`, html, `Programma di allenamento – ${studentName}`, `${fmtDate(plan.startDate)} – ${fmtDate(plan.endDate)}`);
}

// ─── 6. Payment receipt ────────────────────────────────────────────────

const RECEIPT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 32px; font-size: 14px; line-height: 1.6; max-width: 600px; margin: 0 auto; }
  .receipt { border: 2px solid #D40000; border-radius: 12px; padding: 32px; }
  .receipt-header { text-align: center; border-bottom: 2px solid #D40000; padding-bottom: 20px; margin-bottom: 24px; }
  .receipt-header h1 { font-size: 28px; color: #D40000; letter-spacing: 3px; margin-bottom: 4px; }
  .receipt-header .doc-type { font-size: 16px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }
  .receipt-header .doc-number { font-size: 12px; color: #999; margin-top: 4px; }
  .receipt-body { margin-bottom: 24px; }
  .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
  .receipt-row:last-child { border-bottom: none; }
  .receipt-label { font-weight: 600; color: #555; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
  .receipt-value { font-weight: 700; color: #1a1a1a; font-size: 15px; text-align: right; }
  .receipt-amount { text-align: center; margin: 24px 0; padding: 20px; background: #f8f8f8; border-radius: 8px; border: 1px solid #eee; }
  .receipt-amount .amount { font-size: 36px; font-weight: 800; color: #D40000; }
  .receipt-amount .amount-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .receipt-status { text-align: center; margin: 16px 0; }
  .receipt-status .paid-badge { display: inline-block; background: #d4edda; color: #155724; padding: 8px 24px; border-radius: 20px; font-weight: 700; font-size: 14px; letter-spacing: 1px; }
  .receipt-note { text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px dashed #ddd; }
  .receipt-note p { font-size: 11px; color: #999; line-height: 1.6; }
  .receipt-note .important { font-size: 12px; color: #666; font-weight: 600; margin-bottom: 4px; }
  .receipt-footer { text-align: center; margin-top: 16px; font-size: 11px; color: #bbb; }
  @media print { body { padding: 16px; } }
`;

interface PrintPaymentReceiptParams {
  studentName: string;
  amount: number;
  dueDate: any;
  paidDate: Date;
  installmentNumber: number;
  totalInstallments: number;
  planTotal: number;
  paymentType: string;
  planStartDate?: any;
  planEndDate?: any;
}

export function printPaymentReceipt({
  studentName, amount, dueDate, paidDate, installmentNumber, totalInstallments,
  planTotal, paymentType, planStartDate, planEndDate,
}: PrintPaymentReceiptParams) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  const receiptNumber = `ESS-${paidDate.getFullYear()}${String(paidDate.getMonth() + 1).padStart(2, '0')}${String(paidDate.getDate()).padStart(2, '0')}-${Date.now().toString(36).toUpperCase().slice(-5)}`;

  const typeLabels: Record<string, string> = {
    full: 'Pagamento unica soluzione',
    installment: `Rata ${installmentNumber} di ${totalInstallments}`,
    monthly_course: 'Pagamento corso mensile',
  };

  const bodyHtml = `
    <div class="receipt">
      <div class="receipt-header">
        <h1>${LOGO_CHAR}</h1>
        <div class="doc-type">Promemoria di Pagamento</div>
        <div class="doc-number">Rif. ${receiptNumber}</div>
      </div>

      <div class="receipt-amount">
        <div class="amount-label">Importo pagato</div>
        <div class="amount">${fmtCurrency(amount)}</div>
      </div>

      <div class="receipt-status">
        <span class="paid-badge">PAGATO</span>
      </div>

      <div class="receipt-body">
        <div class="receipt-row">
          <span class="receipt-label">Allievo</span>
          <span class="receipt-value">${studentName}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Tipo</span>
          <span class="receipt-value">${typeLabels[paymentType] || paymentType}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Data scadenza</span>
          <span class="receipt-value">${fmtDate(dueDate)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Data pagamento</span>
          <span class="receipt-value">${fmtDate(paidDate)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Importo totale piano</span>
          <span class="receipt-value">${fmtCurrency(planTotal)}</span>
        </div>
        ${planStartDate && planEndDate ? `
        <div class="receipt-row">
          <span class="receipt-label">Periodo percorso</span>
          <span class="receipt-value">${fmtDate(planStartDate)} – ${fmtDate(planEndDate)}</span>
        </div>` : ''}
      </div>

      <div class="receipt-note">
        <p class="important">Questo documento è un promemoria di pagamento.</p>
        <p>Non costituisce ricevuta fiscale né documento contabile ufficiale.<br>
        La ricevuta/fattura ufficiale verrà emessa separatamente.</p>
      </div>

      <div class="receipt-footer">
        Generato il ${fmtDate(new Date())} alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  `;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ricevuta ${receiptNumber} - ${LOGO_CHAR}</title><style>${RECEIPT_CSS}</style></head><body>${bodyHtml}</body></html>`;
  showPrintOverlay(html);
}
