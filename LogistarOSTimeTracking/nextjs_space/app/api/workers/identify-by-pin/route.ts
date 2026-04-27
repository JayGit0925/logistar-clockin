import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    const workers = await prisma.worker.findMany({
      where: { pin },
      select: { id: true, name: true, employeeId: true },
    });

    if (workers.length === 0) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    if (workers.length > 1) {
      return NextResponse.json({ error: 'PIN conflict, contact admin' }, { status: 409 });
    }

    return NextResponse.json(workers[0]);
  } catch (error) {
    console.error('Error identifying worker by PIN:', error);
    return NextResponse.json({ error: 'Failed to verify PIN' }, { status: 500 });
  }
}
