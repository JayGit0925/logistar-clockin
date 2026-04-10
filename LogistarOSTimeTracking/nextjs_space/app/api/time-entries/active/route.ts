import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Determine which step the worker is on
function getShiftStep(entry: any): string {
  if (!entry) return 'none';
  if (!entry.lunchOut) return 'shift_started';   // Needs lunchOut next
  if (!entry.lunchIn) return 'at_lunch';          // Needs lunchIn next
  if (!entry.clockOut) return 'back_from_lunch';  // Needs shiftEnd next
  return 'completed';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');

    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID is required' },
        { status: 400 }
      );
    }

    const activeShift = await prisma.timeEntry.findFirst({
      where: {
        workerId,
        clockOut: null,
      },
      orderBy: {
        clockIn: 'desc',
      },
    });

    return NextResponse.json({
      activeShift,
      step: getShiftStep(activeShift),
    });
  } catch (error: any) {
    console.error('Error fetching active shift:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active shift' },
      { status: 500 }
    );
  }
}
