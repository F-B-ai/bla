import { Student, TrainingSession, BodyMeasurement, PaymentPlan } from '../types';
import { getStudentSessions } from './sessionService';
import { getStudentMeasurements } from './nutritionistService';
import { getStudentPaymentPlans } from './paymentService';
import { getStudentWorkoutLogs } from './workoutLogService';

interface ReportData {
  student: Student;
  coachName: string;
  sessions: TrainingSession[];
  measurements: BodyMeasurement[];
  plans: PaymentPlan[];
  workoutCount: number;
  periodLabel: string;
}

const toDate = (raw: any): Date => {
  if (raw instanceof Date) return raw;
  if (raw?.toDate) return raw.toDate();
  if (raw?.seconds) return new Date(raw.seconds * 1000);
  return new Date(raw);
};

const fmt = (d: Date): string =>
  d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const generateStudentReport = async (
  student: Student,
  coachName: string
): Promise<ReportData> => {
  const [sessions, measurements, plans, logs] = await Promise.all([
    getStudentSessions(student.id),
    getStudentMeasurements(student.id),
    getStudentPaymentPlans(student.id),
    getStudentWorkoutLogs(student.id),
  ]);

  return {
    student,
    coachName,
    sessions,
    measurements,
    plans,
    workoutCount: logs.filter((l) => l.status === 'completed').length,
    periodLabel: fmt(new Date()),
  };
};

const buildHTML = (data: ReportData): string => {
  const { student, coachName, sessions, measurements, plans, workoutCount } = data;

  const completedSessions = sessions.filter(
    (s) => s.status === 'completed' || s.isCountedAsCompleted
  );
  const cancelledSessions = sessions.filter(
    (s) => s.status === 'cancelled_by_student' || s.status === 'cancelled_late'
  );
  const noShows = sessions.filter((s) => s.status === 'no_show');
  const attendanceRate =
    sessions.length > 0
      ? Math.round((completedSessions.length / sessions.length) * 100)
      : 0;

  const startDate = student.startDate ? fmt(toDate(student.startDate)) : 'N/D';

  const latestMeasurement = measurements.length > 0 ? measurements[0] : null;
  const oldestMeasurement =
    measurements.length > 1 ? measurements[measurements.length - 1] : null;

  const activePlan = plans.find((p) => {
    const end = toDate(p.endDate);
    return end >= new Date();
  });

  const paidInstallments = activePlan
    ? activePlan.installments.filter((i) => i.status === 'paid').length
    : 0;
  const totalInstallments = activePlan ? activePlan.installments.length : 0;

  const measurementRows = measurements
    .slice(0, 8)
    .map(
      (m) => `
      <tr>
        <td>${fmt(toDate(m.date))}</td>
        <td>${m.weight != null ? m.weight + ' kg' : '—'}</td>
        <td>${m.bodyFat != null ? m.bodyFat + '%' : '—'}</td>
        <td>${m.muscleMass != null ? m.muscleMass + ' kg' : '—'}</td>
        <td>${m.waist != null ? m.waist + ' cm' : '—'}</td>
        <td>${m.chest != null ? m.chest + ' cm' : '—'}</td>
        <td>${m.arms != null ? m.arms + ' cm' : '—'}</td>
      </tr>`
    )
    .join('');

  const weightDelta =
    latestMeasurement?.weight != null && oldestMeasurement?.weight != null
      ? (latestMeasurement.weight - oldestMeasurement.weight).toFixed(1)
      : null;
  const bfDelta =
    latestMeasurement?.bodyFat != null && oldestMeasurement?.bodyFat != null
      ? (latestMeasurement.bodyFat - oldestMeasurement.bodyFat).toFixed(1)
      : null;

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Report ${student.name} ${student.surname} — ESSĒRE</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a1a;
    background: #fff;
    font-size: 13px;
    line-height: 1.5;
  }
  .page { max-width: 800px; margin: 0 auto; padding: 24px; }

  /* Header */
  .header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 3px solid #D40000; padding-bottom: 16px; margin-bottom: 24px;
  }
  .brand { font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #0A0A0A; }
  .brand-sub { font-size: 11px; color: #888; letter-spacing: 1px; margin-top: 2px; }
  .report-date { text-align: right; color: #666; font-size: 12px; }

  /* Student Info */
  .student-card {
    background: #f8f8f8; border-radius: 12px; padding: 20px;
    margin-bottom: 24px; border-left: 4px solid #D40000;
  }
  .student-name { font-size: 20px; font-weight: 700; color: #0A0A0A; }
  .student-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; }
  .meta-item { font-size: 12px; color: #555; }
  .meta-label { font-weight: 600; color: #333; }

  /* Section */
  .section { margin-bottom: 28px; }
  .section-title {
    font-size: 15px; font-weight: 700; color: #D40000;
    text-transform: uppercase; letter-spacing: 1px;
    border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 14px;
  }

  /* Stats Grid */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stat-box {
    background: #f8f8f8; border-radius: 10px; padding: 14px; text-align: center;
    border: 1px solid #eee;
  }
  .stat-value { font-size: 24px; font-weight: 800; color: #0A0A0A; }
  .stat-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  .stat-green .stat-value { color: #34C759; }
  .stat-red .stat-value { color: #FF453A; }
  .stat-blue .stat-value { color: #007AFF; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th {
    background: #0A0A0A; color: #fff; padding: 8px 10px;
    text-align: left; font-weight: 600; font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }

  /* Delta badges */
  .delta { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-left: 6px; }
  .delta-pos { background: #e8f5e9; color: #2e7d32; }
  .delta-neg { background: #fce4ec; color: #c62828; }

  /* Payment */
  .payment-bar-track {
    background: #eee; border-radius: 8px; height: 14px; overflow: hidden;
    margin-top: 8px;
  }
  .payment-bar-fill {
    height: 100%; background: #34C759; border-radius: 8px;
    transition: width 0.3s;
  }
  .payment-info { display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; color: #555; }

  /* Footer */
  .footer {
    margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd;
    text-align: center; font-size: 10px; color: #aaa;
  }

  /* Changes summary */
  .changes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
  .change-box {
    background: #fff; border: 1px solid #eee; border-radius: 10px;
    padding: 12px; text-align: center;
  }
  .change-label { font-size: 10px; color: #888; text-transform: uppercase; }
  .change-value { font-size: 18px; font-weight: 800; margin-top: 4px; }
  .change-from { font-size: 10px; color: #aaa; margin-top: 2px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">ESSĒRE</div>
      <div class="brand-sub">Report Progressi Allievo</div>
    </div>
    <div class="report-date">
      Generato il ${fmt(new Date())}<br>
      <strong>${data.periodLabel}</strong>
    </div>
  </div>

  <!-- Student Card -->
  <div class="student-card">
    <div class="student-name">${student.name} ${student.surname}</div>
    <div class="student-meta">
      <div class="meta-item"><span class="meta-label">Email:</span> ${student.email}</div>
      <div class="meta-item"><span class="meta-label">Telefono:</span> ${student.phone || 'N/D'}</div>
      <div class="meta-item"><span class="meta-label">Inizio percorso:</span> ${startDate}</div>
      <div class="meta-item"><span class="meta-label">Coach:</span> ${coachName || 'N/D'}</div>
      ${student.goals ? `<div class="meta-item"><span class="meta-label">Obiettivi:</span> ${student.goals}</div>` : ''}
    </div>
  </div>

  <!-- Session Stats -->
  <div class="section">
    <div class="section-title">Riepilogo Sessioni</div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value">${sessions.length}</div>
        <div class="stat-label">Sessioni Totali</div>
      </div>
      <div class="stat-box stat-green">
        <div class="stat-value">${completedSessions.length}</div>
        <div class="stat-label">Completate</div>
      </div>
      <div class="stat-box stat-red">
        <div class="stat-value">${cancelledSessions.length + noShows.length}</div>
        <div class="stat-label">Cancellate / No-show</div>
      </div>
      <div class="stat-box stat-blue">
        <div class="stat-value">${attendanceRate}%</div>
        <div class="stat-label">Tasso Presenza</div>
      </div>
    </div>
  </div>

  <!-- Workout Stats -->
  <div class="section">
    <div class="section-title">Allenamenti</div>
    <div class="stats-grid">
      <div class="stat-box stat-green">
        <div class="stat-value">${workoutCount}</div>
        <div class="stat-label">Allenamenti Completati</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${activePlan ? activePlan.usedLessons : 0}/${activePlan ? activePlan.includedLessons : 0}</div>
        <div class="stat-label">Lezioni Usate</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${activePlan ? activePlan.usedConsultations : 0}/${activePlan ? activePlan.includedConsultations : 0}</div>
        <div class="stat-label">Consulenze Usate</div>
      </div>
      <div class="stat-box stat-blue">
        <div class="stat-value">${sessions.length > 0 ? Math.round((workoutCount / sessions.length) * 100) : 0}%</div>
        <div class="stat-label">Costanza</div>
      </div>
    </div>
  </div>

  ${measurements.length > 0 ? `
  <!-- Body Changes Summary -->
  <div class="section">
    <div class="section-title">Variazioni Corporee</div>
    <div class="changes-grid">
      ${latestMeasurement?.weight != null ? `
      <div class="change-box">
        <div class="change-label">Peso</div>
        <div class="change-value">${latestMeasurement.weight} kg</div>
        ${weightDelta ? `
          <div class="change-from">
            ${oldestMeasurement?.weight} kg
            <span class="delta ${parseFloat(weightDelta) <= 0 ? 'delta-neg' : 'delta-pos'}">
              ${parseFloat(weightDelta) > 0 ? '+' : ''}${weightDelta} kg
            </span>
          </div>
        ` : ''}
      </div>` : ''}
      ${latestMeasurement?.bodyFat != null ? `
      <div class="change-box">
        <div class="change-label">Massa Grassa</div>
        <div class="change-value">${latestMeasurement.bodyFat}%</div>
        ${bfDelta ? `
          <div class="change-from">
            ${oldestMeasurement?.bodyFat}%
            <span class="delta ${parseFloat(bfDelta) <= 0 ? 'delta-neg' : 'delta-pos'}">
              ${parseFloat(bfDelta) > 0 ? '+' : ''}${bfDelta}%
            </span>
          </div>
        ` : ''}
      </div>` : ''}
      ${latestMeasurement?.muscleMass != null ? `
      <div class="change-box">
        <div class="change-label">Massa Muscolare</div>
        <div class="change-value">${latestMeasurement.muscleMass} kg</div>
        ${oldestMeasurement?.muscleMass != null ? `
          <div class="change-from">
            ${oldestMeasurement.muscleMass} kg
            <span class="delta ${(latestMeasurement.muscleMass! - oldestMeasurement.muscleMass!) >= 0 ? 'delta-pos' : 'delta-neg'}">
              ${(latestMeasurement.muscleMass! - oldestMeasurement.muscleMass!) > 0 ? '+' : ''}${(latestMeasurement.muscleMass! - oldestMeasurement.muscleMass!).toFixed(1)} kg
            </span>
          </div>
        ` : ''}
      </div>` : ''}
    </div>
  </div>

  <!-- Measurements Table -->
  <div class="section">
    <div class="section-title">Storico Misurazioni</div>
    <table>
      <thead>
        <tr>
          <th>Data</th><th>Peso</th><th>Grassa</th><th>Muscolare</th><th>Vita</th><th>Petto</th><th>Braccia</th>
        </tr>
      </thead>
      <tbody>
        ${measurementRows}
      </tbody>
    </table>
  </div>
  ` : `
  <div class="section">
    <div class="section-title">Misurazioni</div>
    <p style="color: #888; font-style: italic;">Nessuna misurazione registrata.</p>
  </div>
  `}

  <!-- Payment Status -->
  ${activePlan ? `
  <div class="section">
    <div class="section-title">Stato Pagamenti</div>
    <div style="background: #f8f8f8; border-radius: 10px; padding: 16px; border: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 700; font-size: 14px;">Percorso attivo</div>
          <div style="font-size: 12px; color: #888; margin-top: 2px;">
            ${fmt(toDate(activePlan.startDate))} — ${fmt(toDate(activePlan.endDate))}
          </div>
        </div>
        <div style="font-weight: 800; font-size: 18px; color: #0A0A0A;">
          €${activePlan.totalAmount.toLocaleString()}
        </div>
      </div>
      <div class="payment-bar-track">
        <div class="payment-bar-fill" style="width: ${totalInstallments > 0 ? Math.round((paidInstallments / totalInstallments) * 100) : 0}%"></div>
      </div>
      <div class="payment-info">
        <span>${paidInstallments} di ${totalInstallments} rate pagate</span>
        <span>${totalInstallments > 0 ? Math.round((paidInstallments / totalInstallments) * 100) : 0}% completato</span>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    ESSĒRE — Report generato il ${fmt(new Date())} · Documento riservato
  </div>

</div>

<script>
  // Auto-print button (hidden on print)
  const btn = document.createElement('button');
  btn.textContent = 'Stampa / Salva PDF';
  btn.className = 'no-print';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#D40000;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  btn.onclick = function() { window.print(); };
  document.body.appendChild(btn);
</script>
</body>
</html>`;
};

declare const window: any;
declare const document: any;
declare const Blob: any;
declare const URL: any;

export const openStudentReport = async (
  student: Student,
  coachName: string
): Promise<void> => {
  const data = await generateStudentReport(student, coachName);
  const html = buildHTML(data);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const opened = window.open(url, '_blank');

  if (!opened) {
    // Fallback: navigate current page (will leave app)
    window.location.href = url;
  }
};
