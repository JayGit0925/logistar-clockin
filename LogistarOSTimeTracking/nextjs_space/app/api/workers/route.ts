import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includePin = searchParams.get('includePin') === 'true';

    const workers = await prisma.worker.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        employeeId: true,
        pin: includePin,
        createdAt: true,
      },
    });
    return NextResponse.json(workers);
  } catch (error: any) {
    console.error('Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, employeeId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const pin = generatePin();

    const worker = await prisma.worker.create({
      data: {
        name,
        employeeId: employeeId || null,
        pin,
      },
    });

    return NextResponse.json(worker, { status: 201 });
  } catch (error: any) {
    console.error('Error creating worker:', error);
    return NextResponse.json(
      { error: 'Failed to create worker' },
      { status: 500 }
    );
  }
}
