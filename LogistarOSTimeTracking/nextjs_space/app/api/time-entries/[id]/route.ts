import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { calculateTotalHours, applyPaidLunchStamps } from '@/lib/total-hours';

dayjs.extend(utc);
dayjs.extend(timezone);

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { clockIn, lunchOut, lunchIn, clockOut } = body;

    if (!clockIn) {
      return NextResponse.json(
        { error: 'Shift start (clockIn) is required' },
        { status: 400 }
      );
    }

    const entry = await prisma.timeEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      );
    }

    const worker = await prisma.worker.findUnique({
      where: { id: entry.workerId },
    });
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const clockInDate = new Date(clockIn);
    const clockOutDate = clockOut ? new Date(clockOut) : null;
    let lunchOutDate = lunchOut ? new Date(lunchOut) : null;
    let lunchInDate = lunchIn ? new Date(lunchIn) : null;

    if (worker.paidLunch && clockOutDate) {
      const stamps = applyPaidLunchStamps({
        clockIn: clockInDate,
        clockOut: clockOutDate,
        paidLunch: true,
      });
      lunchOutDate = stamps.lunchOut;
      lunchInDate = stamps.lunchIn;
    }

    const data: {
      clockIn: Date;
      lunchOut: Date | null;
      lunchIn: Date | null;
      clockOut: Date | null;
      totalHours: number | null;
      date: string;
    } = {
      clockIn: clockInDate,
      lunchOut: lunchOutDate,
      lunchIn: lunchInDate,
      clockOut: clockOutDate,
      totalHours: calculateTotalHours({
        clockIn: clockInDate,
        clockOut: clockOutDate,
        lunchOut: lunchOutDate,
        lunchIn: lunchInDate,
        paidLunch: worker.paidLunch,
      }),
      date: dayjs(clockIn).tz('America/New_York').format('YYYY-MM-DD'),
    };

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: params.id },
      data,
      include: {
        worker: {
          select: { name: true, employeeId: true },
        },
      },
    });

    return NextResponse.json(updatedEntry);
  } catch (error: unknown) {
    console.error('Error updating time entry:', error);
    return NextResponse.json(
      { error: 'Failed to update time entry' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, timestamp } = body;

    if (!action || !timestamp) {
      return NextResponse.json(
        { error: 'Action and timestamp are required' },
        { status: 400 }
      );
    }

    const entry = await prisma.timeEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      );
    }

    const ts = new Date(timestamp);
    const data: any = {};

    switch (action) {
      case 'lunchOut':
        data.lunchOut = ts;
        break;
      case 'lunchIn':
        data.lunchIn = ts;
        break;
      case 'shiftEnd':
      case 'clockOut': {
        const worker = await prisma.worker.findUnique({
          where: { id: entry.workerId },
        });
        if (!worker) {
          return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }
        data.clockOut = ts;
        let lunchOut = entry.lunchOut;
        let lunchIn = entry.lunchIn;
        if (worker.paidLunch) {
          const stamps = applyPaidLunchStamps({
            clockIn: entry.clockIn,
            clockOut: ts,
            paidLunch: true,
          });
          lunchOut = stamps.lunchOut;
          lunchIn = stamps.lunchIn;
          data.lunchOut = lunchOut;
          data.lunchIn = lunchIn;
        }
        data.totalHours = calculateTotalHours({
          clockIn: entry.clockIn,
          clockOut: ts,
          lunchOut,
          lunchIn,
          paidLunch: worker.paidLunch,
        });
        break;
      }
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(updatedEntry);
  } catch (error: any) {
    console.error('Error updating time entry:', error);
    return NextResponse.json(
      { error: 'Failed to update time entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.timeEntry.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting time entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete time entry' },
      { status: 500 }
    );
  }
}
