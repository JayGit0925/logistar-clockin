import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function parseDecimal(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

function parsePayType(v: unknown): 'HOURLY' | 'SALARY' | undefined {
  if (v === 'HOURLY' || v === 'SALARY') return v;
  return undefined;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, employeeId, regeneratePin, paidLunch, company, payType, hourlyRate, annualSalary } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const data: any = {
      name,
      employeeId: employeeId || null,
    };

    if (regeneratePin) data.pin = generatePin();
    if (typeof paidLunch === 'boolean') data.paidLunch = paidLunch;
    if ('company' in body) data.company = company?.trim() || null;
    const pt = parsePayType(payType);
    if (pt) data.payType = pt;
    if ('hourlyRate' in body) data.hourlyRate = parseDecimal(hourlyRate);
    if ('annualSalary' in body) data.annualSalary = parseDecimal(annualSalary);

    const worker = await prisma.worker.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(worker);
  } catch (error: any) {
    console.error('Error updating worker:', error);
    return NextResponse.json(
      { error: 'Failed to update worker' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.worker.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting worker:', error);
    return NextResponse.json(
      { error: 'Failed to delete worker' },
      { status: 500 }
    );
  }
}
