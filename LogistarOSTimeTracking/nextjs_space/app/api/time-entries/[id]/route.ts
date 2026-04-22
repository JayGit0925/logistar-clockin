import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

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

    const data: {
      clockIn: Date;
      lunchOut: Date | null;
      lunchIn: Date | null;
      clockOut: Date | null;
      totalHours: number | null;
      date: string;
    } = {
      clockIn: new Date(clockIn),
      lunchOut: lunchOut ? new Date(lunchOut) : null,
      lunchIn: lunchIn ? new Date(lunchIn) : null,
      clockOut: clockOut ? new Date(clockOut) : null,
      totalHours: null,
      date: dayjs(clockIn).tz('America/New_York').format('YYYY-MM-DD'),
    };

    if (clockOut) {
      const shiftMs = dayjs(clockOut).diff(dayjs(clockIn));
      let lunchMs = 0;
      if (lunchOut && lunchIn) {
        lunchMs = dayjs(lunchIn).diff(dayjs(lunchOut));
      } else if (lunchOut && !lunchIn) {
        lunchMs = dayjs(clockOut).diff(dayjs(lunchOut));
      }
      const totalMs = shiftMs - lunchMs;
      data.totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
    }

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
    const { action, timestamp, photoUrl } = body;

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
        if (photoUrl) data.lunchOutPhotoUrl = photoUrl;
        break;
      case 'lunchIn':
        data.lunchIn = ts;
        if (photoUrl) data.lunchInPhotoUrl = photoUrl;
        break;
      case 'shiftEnd': {
        data.clockOut = ts;
        if (photoUrl) data.clockOutPhotoUrl = photoUrl;
        // Calculate total hours: (shiftEnd - shiftStart) - (lunchIn - lunchOut)
        const shiftMs = dayjs(ts).diff(dayjs(entry.clockIn));
        let lunchMs = 0;
        if (entry.lunchOut && entry.lunchIn) {
          lunchMs = dayjs(entry.lunchIn).diff(dayjs(entry.lunchOut));
        } else if (entry.lunchOut && !entry.lunchIn) {
          // Lunch out but never came back - treat current time as lunch in
          lunchMs = dayjs(ts).diff(dayjs(entry.lunchOut));
        }
        const totalMs = shiftMs - lunchMs;
        data.totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
        break;
      }
      // Legacy support: clockOut directly
      case 'clockOut':
        data.clockOut = ts;
        if (photoUrl) data.clockOutPhotoUrl = photoUrl;
        const hours = dayjs(ts).diff(dayjs(entry.clockIn), 'hour', true);
        data.totalHours = Math.round(hours * 100) / 100;
        break;
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
