import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildTimeEntryCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (workerId) where.workerId = workerId;
    if (startDate && endDate) where.date = { gte: startDate, lte: endDate };
    else if (startDate) where.date = { gte: startDate };
    else if (endDate) where.date = { lte: endDate };

    const entries = await prisma.timeEntry.findMany({
      where,
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
      orderBy: { clockIn: 'desc' },
    });

    const csv = buildTimeEntryCsv(
      entries.map((e) => ({
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
      }))
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=time-entries.csv',
      },
    });
  } catch (error: any) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
