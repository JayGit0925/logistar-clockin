import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();

const TIMEZONE = 'America/New_York';

async function main() {
  console.log('Seeding database...');

  function generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  const worker1 = await prisma.worker.upsert({
    where: { id: '1' },
    update: { pin: undefined },
    create: {
      id: '1',
      name: 'John Smith',
      employeeId: 'EMP001',
      pin: generatePin(),
    },
  });

  const worker2 = await prisma.worker.upsert({
    where: { id: '2' },
    update: { pin: undefined },
    create: {
      id: '2',
      name: 'Jane Doe',
      employeeId: 'EMP002',
      pin: generatePin(),
    },
  });

  const worker3 = await prisma.worker.upsert({
    where: { id: '3' },
    update: { pin: undefined },
    create: {
      id: '3',
      name: 'Mike Johnson',
      employeeId: null,
      pin: generatePin(),
    },
  });

  const worker4 = await prisma.worker.upsert({
    where: { id: '4' },
    update: { pin: undefined },
    create: {
      id: '4',
      name: 'Sarah Williams',
      employeeId: 'EMP004',
      pin: generatePin(),
    },
  });

  console.log('Created workers:', { worker1, worker2, worker3, worker4 });

  const today = dayjs().tz(TIMEZONE);
  const yesterday = today.subtract(1, 'day');

  const entry1 = await prisma.timeEntry.upsert({
    where: { id: 'entry-1' },
    update: {},
    create: {
      id: 'entry-1',
      workerId: '1',
      clockIn: yesterday.hour(8).minute(0).toDate(),
      lunchOut: yesterday.hour(12).minute(0).toDate(),
      lunchIn: yesterday.hour(12).minute(30).toDate(),
      clockOut: yesterday.hour(16).minute(30).toDate(),
      totalHours: 8,
      date: yesterday.format('YYYY-MM-DD'),
    },
  });

  const entry2 = await prisma.timeEntry.upsert({
    where: { id: 'entry-2' },
    update: {},
    create: {
      id: 'entry-2',
      workerId: '2',
      clockIn: yesterday.hour(9).minute(0).toDate(),
      lunchOut: yesterday.hour(12).minute(30).toDate(),
      lunchIn: yesterday.hour(13).minute(0).toDate(),
      clockOut: yesterday.hour(17).minute(0).toDate(),
      totalHours: 7.5,
      date: yesterday.format('YYYY-MM-DD'),
    },
  });

  const entry3 = await prisma.timeEntry.upsert({
    where: { id: 'entry-3' },
    update: {},
    create: {
      id: 'entry-3',
      workerId: '3',
      clockIn: today.hour(7).minute(30).toDate(),
      lunchOut: today.hour(11).minute(30).toDate(),
      lunchIn: today.hour(12).minute(0).toDate(),
      clockOut: today.hour(15).minute(30).toDate(),
      totalHours: 7.5,
      date: today.format('YYYY-MM-DD'),
    },
  });

  console.log('Created time entries:', { entry1, entry2, entry3 });
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
