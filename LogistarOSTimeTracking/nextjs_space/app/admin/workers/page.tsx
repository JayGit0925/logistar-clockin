'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Trash2, Users, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { LanguageSelector } from '@/components/language-selector';
import { useLanguage } from '@/lib/language-context';
import toast from 'react-hot-toast';

interface Worker {
  id: string;
  name: string;
  employeeId: string | null;
  pin?: string;
  paidLunch: boolean;
  company: string | null;
  payType: 'HOURLY' | 'SALARY';
  hourlyRate: string | null;
  annualSalary: string | null;
}

export default function WorkersPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    company: '',
    payType: 'HOURLY' as 'HOURLY' | 'SALARY',
    hourlyRate: '',
    annualSalary: '',
  });

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_authenticated');
    if (auth !== 'true') {
      router.push('/admin');
    } else {
      setIsAuthenticated(true);
      fetchWorkers();
    }
    setIsChecking(false);
  }, [router]);

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/workers?includePin=true');
      if (response.ok) {
        const data = await response.json();
        setWorkers(data);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast.error('Failed to load workers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePin = async (worker: Worker) => {
    if (!confirm(t('regenerateConfirm', { name: worker.name }))) return;

    try {
      const response = await fetch(`/api/workers/${worker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: worker.name,
          employeeId: worker.employeeId,
          regeneratePin: true,
        }),
      });

      if (response.ok) {
        toast.success(t('newPinGenerated', { name: worker.name }));
        setShowPins({ ...showPins, [worker.id]: true });
        fetchWorkers();
      } else {
        toast.error(t('failedAction'));
      }
    } catch (error) {
      console.error('Error regenerating PIN:', error);
      toast.error(t('failedAction'));
    }
  };

  const togglePinVisibility = (workerId: string) => {
    setShowPins({ ...showPins, [workerId]: !showPins[workerId] });
  };

  const handleTogglePaidLunch = async (worker: Worker) => {
    const next = !worker.paidLunch;
    setWorkers((prev) =>
      prev.map((w) => (w.id === worker.id ? { ...w, paidLunch: next } : w))
    );
    try {
      const response = await fetch(`/api/workers/${worker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: worker.name,
          employeeId: worker.employeeId,
          paidLunch: next,
        }),
      });
      if (!response.ok) throw new Error('failed');
      toast.success(next ? t('paidLunchEnabled') : t('paidLunchDisabled'));
    } catch {
      setWorkers((prev) =>
        prev.map((w) => (w.id === worker.id ? { ...w, paidLunch: !next } : w))
      );
      toast.error(t('failedAction'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t('nameRequired'));
      return;
    }

    try {
      const url = editingWorker ? `/api/workers/${editingWorker.id}` : '/api/workers';
      const method = editingWorker ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          employeeId: formData.employeeId || null,
          company: formData.company || null,
          payType: formData.payType,
          hourlyRate: formData.payType === 'HOURLY' ? formData.hourlyRate : null,
          annualSalary: formData.payType === 'SALARY' ? formData.annualSalary : null,
        }),
      });

      if (response.ok) {
        toast.success(editingWorker ? t('workerUpdated') : t('workerAdded'));
        setShowModal(false);
        setFormData({
          name: '',
          employeeId: '',
          company: '',
          payType: 'HOURLY',
          hourlyRate: '',
          annualSalary: '',
        });
        setEditingWorker(null);
        fetchWorkers();
      } else {
        toast.error(t('failedAction'));
      }
    } catch (error) {
      console.error('Error saving worker:', error);
      toast.error(t('failedAction'));
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      employeeId: worker.employeeId || '',
      company: worker.company || '',
      payType: worker.payType,
      hourlyRate: worker.hourlyRate || '',
      annualSalary: worker.annualSalary || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteWorkerConfirm'))) return;

    try {
      const response = await fetch(`/api/workers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('workerDeleted'));
        fetchWorkers();
      } else {
        toast.error(t('failedAction'));
      }
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast.error(t('failedAction'));
    }
  };

  const handleAddNew = () => {
    setEditingWorker(null);
    setFormData({
      name: '',
      employeeId: '',
      company: '',
      payType: 'HOURLY',
      hourlyRate: '',
      annualSalary: '',
    });
    setShowModal(true);
  };

  const companies = Array.from(
    new Set(workers.map((w) => w.company).filter((c): c is string => !!c))
  ).sort();

  const filteredWorkers = companyFilter
    ? workers.filter((w) => w.company === companyFilter)
    : workers;

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <Users className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">{t('manageWorkers')}</h1>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                aria-label={t('filterByCompany')}
              >
                <option value="">{t('allCompanies')}</option>
                {companies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <LanguageSelector />
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addWorker')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">{t('loading')}</p>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">{t('noWorkersYet')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('employeeId')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('company')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('payType')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('pin')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('paidLunch')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorkers.map((worker: Worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {worker.employeeId || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{worker.company || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {worker.payType === 'HOURLY'
                          ? `${t('hourly')} · $${worker.hourlyRate ?? '-'}/hr`
                          : `${t('salary')} · $${worker.annualSalary ?? '-'}/yr`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold text-gray-800 min-w-[48px]">
                          {showPins[worker.id] ? (worker.pin || 'N/A') : '••••'}
                        </span>
                        <button
                          onClick={() => togglePinVisibility(worker.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title={showPins[worker.id] ? 'Hide PIN' : 'Show PIN'}
                        >
                          {showPins[worker.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleRegeneratePin(worker)}
                          className="text-orange-500 hover:text-orange-700 transition-colors"
                          title={t('regeneratePin')}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleTogglePaidLunch(worker)}
                        aria-pressed={worker.paidLunch}
                        title={t('paidLunchHint')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          worker.paidLunch ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            worker.paidLunch ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(worker)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(worker.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingWorker ? t('editWorker') : t('addWorker')}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('name')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('employeeId')}
                </label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company')}
                </label>
                <input
                  type="text"
                  list="company-options"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <datalist id="company-options">
                  {companies.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('payType')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payType"
                      value="HOURLY"
                      checked={formData.payType === 'HOURLY'}
                      onChange={() => setFormData({ ...formData, payType: 'HOURLY' })}
                    />
                    {t('hourly')}
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payType"
                      value="SALARY"
                      checked={formData.payType === 'SALARY'}
                      onChange={() => setFormData({ ...formData, payType: 'SALARY' })}
                    />
                    {t('salary')}
                  </label>
                </div>
              </div>

              {formData.payType === 'HOURLY' ? (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('hourlyRate')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('annualSalary')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.annualSalary}
                    onChange={(e) => setFormData({ ...formData, annualSalary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      name: '',
                      employeeId: '',
                      company: '',
                      payType: 'HOURLY',
                      hourlyRate: '',
                      annualSalary: '',
                    });
                    setEditingWorker(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingWorker ? t('update') : t('add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
