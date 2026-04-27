import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDateString } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

interface ImportEntry {
  workerName: string;
  date: string;
  clockIn: string;
  lunchOut?: string;
  lunchIn?: string;
  clockOut?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entries, overwrite } = body as {
      entries: ImportEntry[];
      overwrite?: boolean;
    };

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries to import' },
        { status: 400 }
      );
    }

    const workers = await prisma.worker.findMany();
    const workerMap = new Map(workers.map((w) => [w.name.toLowerCase(), w.id]));

    let importedCount = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      try {
        const workerName = entry.workerName?.trim() || '';
        if (!workerName) {
          errors.push('Row missing worker name');
          continue;
        }

        const workerId = workerMap.get(workerName.toLowerCase());
        if (!workerId) {
          errors.push(`Worker not found: ${workerName}`);
          continue;
        }

        if (!entry.clockIn) {
          errors.push(`${workerName}: missing clock in time`);
          continue;
        }

        const clockInDate = new Date(entry.clockIn);
        const clockOutDate = entry.clockOut ? new Date(entry.clockOut) : null;
        const date = entry.date || getDateString(clockInDate);

        // Overwrite: delete existing entries for this date if requested
        if (overwrite) {
          await prisma.timeEntry.deleteMany({
            where: {
              workerId,
              date,
            },
          });
        }

        // Calculate total hours
        let totalHours = null;
        if (clockOutDate) {
          let duration =
            (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60);
          if (entry.lunchOut && entry.lunchIn) {
            const lunchDuration =
              (new Date(entry.lunchIn).getTime() -
                new Date(entry.lunchOut).getTime()) /
              (1000 * 60 * 60);
            duration -= lunchDuration;
          }
          totalHours = Math.max(0, Math.round(duration * 100) / 100);
        }

        await prisma.timeEntry.create({
          data: {
            workerId,
            clockIn: clockInDate,
            lunchOut: entry.lunchOut ? new Date(entry.lunchOut) : null,
            lunchIn: entry.lunchIn ? new Date(entry.lunchIn) : null,
            clockOut: clockOutDate,
            totalHours,
            date,
          },
        });

        importedCount++;
      } catch (err: any) {
        console.error('Error importing entry:', err);
        errors.push(`Error: ${err.message}`);
      }
    }

    return NextResponse.json(
      {
        count: importedCount,
        total: entries.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in import route:', error);
    return NextResponse.json(
      { error: 'Failed to process import' },
      { status: 500 }
    );
  }
}
