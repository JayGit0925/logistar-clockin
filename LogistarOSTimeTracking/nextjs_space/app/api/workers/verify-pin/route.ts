import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workerId, pin } = body;

    if (!workerId || !pin) {
      return NextResponse.json(
        { error: 'Worker ID and PIN are required' },
        { status: 400 }
      );
    }

    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: { pin: true },
    });

    if (!worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    if (worker.pin !== pin) {
      return NextResponse.json(
        { error: 'Incorrect PIN', valid: false },
        { status: 401 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error: any) {
    console.error('Error verifying PIN:', error);
    return NextResponse.json(
      { error: 'Failed to verify PIN' },
      { status: 500 }
    );
  }
}
