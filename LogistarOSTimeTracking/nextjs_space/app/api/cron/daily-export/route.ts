import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildTimeEntryCsv } from '@/lib/csv';
import { sendDailyExportEmail } from '@/lib/email';
import { getNowInET } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

// Vercel Cron sends a GET with Authorization: Bearer <CRON_SECRET>.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // "Yesterday" relative to America/New_York.
    const dateStr = getNowInET().subtract(1, 'day').format('YYYY-MM-DD');

    const entries = await prisma.timeEntry.findMany({
      where: { date: dateStr },
      include: {
        worker: {
          select: {
            name: true,
            employeeId: true,
            company: true,
            payType: true,
            hourlyRate: true,
            annualSalary: true,
          },
        },
      },
      orderBy: { clockIn: 'asc' },
    });

    const csvEntries = entries.map((e) => ({
      clockIn: e.clockIn,
      lunchOut: e.lunchOut,
      lunchIn: e.lunchIn,
      clockOut: e.clockOut,
      totalHours: e.totalHours,
      worker: {
        name: e.worker.name,
        employeeId: e.worker.employeeId,
        company: e.worker.company,
        payType: e.worker.payType,
        hourlyRate: e.worker.hourlyRate?.toString() ?? null,
        annualSalary: e.worker.annualSalary?.toString() ?? null,
      },
    }));

    const csv = buildTimeEntryCsv(csvEntries);

    const totalHours = csvEntries.reduce((s, e) => s + (e.totalHours ?? 0), 0);
    const estGrossPay = csvEntries.reduce((s, e) => {
      if (e.worker.payType !== 'HOURLY') return s;
      const rate = Number(e.worker.hourlyRate);
      if (!Number.isFinite(rate) || e.totalHours === null) return s;
      return s + rate * e.totalHours;
    }, 0);
    const workerCount = new Set(csvEntries.map((e) => e.worker.name)).size;

    await sendDailyExportEmail({
      dateStr,
      csv,
      workerCount,
      entryCount: csvEntries.length,
      totalHours,
      estGrossPay,
    });

    return NextResponse.json({
      ok: true,
      date: dateStr,
      workers: workerCount,
      entries: csvEntries.length,
    });
  } catch (err: any) {
    console.error('[cron daily-export] failed:', err);
    return NextResponse.json({ error: err.message ?? 'failed' }, { status: 500 });
  }
}
