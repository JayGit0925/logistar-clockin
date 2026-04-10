import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

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
      case 'shiftEnd': {
        data.clockOut = ts;
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
