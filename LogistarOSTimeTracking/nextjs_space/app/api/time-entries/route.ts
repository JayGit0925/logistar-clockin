import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDateString } from '@/lib/timezone';
import { calculateTotalHours, applyPaidLunchStamps } from '@/lib/total-hours';

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
    const { workerId, clockIn, lunchOut, lunchIn, clockOut, force } = body;

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
    const lunchOutDate = lunchOut ? new Date(lunchOut) : null;
    const lunchInDate = lunchIn ? new Date(lunchIn) : null;

    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    let finalLunchOut = lunchOutDate;
    let finalLunchIn = lunchInDate;
    if (worker.paidLunch && clockOutDate) {
      const stamps = applyPaidLunchStamps({
        clockIn: clockInDate,
        clockOut: clockOutDate,
        paidLunch: true,
      });
      finalLunchOut = stamps.lunchOut;
      finalLunchIn = stamps.lunchIn;
    }

    const totalHours = calculateTotalHours({
      clockIn: clockInDate,
      clockOut: clockOutDate,
      lunchOut: finalLunchOut,
      lunchIn: finalLunchIn,
      paidLunch: worker.paidLunch,
    });

    const entry = await prisma.timeEntry.create({
      data: {
        workerId,
        clockIn: clockInDate,
        lunchOut: finalLunchOut,
        lunchIn: finalLunchIn,
        clockOut: clockOutDate,
        totalHours,
        date: getDateString(clockInDate),
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
