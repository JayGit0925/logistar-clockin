import { prisma } from '@/lib/prisma';
import { WorkerGrid } from './_components/worker-grid';
import { HomeHeader } from './_components/home-header';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const workers = await prisma.worker.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <HomeHeader />
        <WorkerGrid workers={workers} />
        <div className="mt-8 text-center">
          <a
            href="/admin"
            className="inline-block text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
