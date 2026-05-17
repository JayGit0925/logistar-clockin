import { Resend } from 'resend';

export type DailyExportEmailInput = {
  dateStr: string;          // 'YYYY-MM-DD' in ET
  csv: string;
  workerCount: number;
  entryCount: number;
  totalHours: number;
  estGrossPay: number;
};

export async function sendDailyExportEmail(input: DailyExportEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.EXPORT_RECIPIENT;
  const from = process.env.EXPORT_FROM;
  if (!apiKey) throw new Error('RESEND_API_KEY not set');
  if (!to) throw new Error('EXPORT_RECIPIENT not set');
  if (!from) throw new Error('EXPORT_FROM not set');

  const resend = new Resend(apiKey);
  const filename = `time-entries-${input.dateStr}.csv`;

  const text = [
    `Time entries — ${input.dateStr}`,
    '',
    `Workers:     ${input.workerCount}`,
    `Entries:     ${input.entryCount}`,
    `Total hours: ${input.totalHours.toFixed(2)}`,
    `Est. gross pay (hourly only): $${input.estGrossPay.toFixed(2)}`,
    '',
    `CSV attached: ${filename}`,
  ].join('\n');

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `Time entries — ${input.dateStr}`,
    text,
    attachments: [
      { filename, content: Buffer.from(input.csv, 'utf8') },
    ],
  });

  if (error) throw new Error(`Resend send failed: ${JSON.stringify(error)}`);
  return data;
}
