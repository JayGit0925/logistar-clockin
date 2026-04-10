import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDateForDisplay } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (workerId) {
      where.workerId = workerId;
    }

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: { worker: true },
      orderBy: { clockIn: 'desc' },
    });

    const csvHeader = 'Worker Name,Employee ID,Shift Start,Lunch Out,Lunch In,Shift End,Total Hours\n';
    const csvRows = entries.map((entry: any) => {
      const workerName = entry.worker?.name || '';
      const employeeId = entry.worker?.employeeId || '';
      const shiftStart = formatDateForDisplay(entry.clockIn);
      const lunchOut = entry.lunchOut ? formatDateForDisplay(entry.lunchOut) : '';
      const lunchIn = entry.lunchIn ? formatDateForDisplay(entry.lunchIn) : '';
      const shiftEnd = entry.clockOut ? formatDateForDisplay(entry.clockOut) : 'Active';
      const totalHours = entry.totalHours !== null ? entry.totalHours.toFixed(2) : '-';

      return `"${workerName}","${employeeId}","${shiftStart}","${lunchOut}","${lunchIn}","${shiftEnd}","${totalHours}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=time-entries.csv',
      },
    });
  } catch (error: any) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    );
  }
}
