import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDateString } from '@/lib/timezone';

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

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workerId, clockIn, lunchOut, lunchIn, clockOut, force, clockInPhotoUrl } = body;

    if (!workerId || !clockIn) {
      return NextResponse.json(
        { error: 'Worker ID and clock in time are required' },
        { status: 400 }
      );
    }

    if (!force) {
      // Prevent duplicate: check if there's an incomplete shift (no clockOut)
      const activeShift = await prisma.timeEntry.findFirst({
        where: { workerId, clockOut: null },
      });

      if (activeShift) {
        return NextResponse.json(
          { error: 'Worker already has an active shift' },
          { status: 400 }
        );
      }
    }

    const clockInDate = new Date(clockIn);
    const clockOutDate = clockOut ? new Date(clockOut) : null;

    let totalHours = null;
    if (clockOutDate) {
      let duration = (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60);
      if (lunchOut && lunchIn) {
        const lunchDuration =
          (new Date(lunchIn).getTime() - new Date(lunchOut).getTime()) / (1000 * 60 * 60);
        duration -= lunchDuration;
      }
      totalHours = Math.max(0, Math.round(duration * 100) / 100);
    }

    const entry = await prisma.timeEntry.create({
      data: {
        workerId,
        clockIn: clockInDate,
        lunchOut: lunchOut ? new Date(lunchOut) : null,
        lunchIn: lunchIn ? new Date(lunchIn) : null,
        clockOut: clockOutDate,
        totalHours,
        date: getDateString(clockInDate),
        clockInPhotoUrl: clockInPhotoUrl || null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('Error creating time entry:', error);
    return NextResponse.json(
      { error: 'Failed to create time entry' },
      { status: 500 }
    );
  }
}
