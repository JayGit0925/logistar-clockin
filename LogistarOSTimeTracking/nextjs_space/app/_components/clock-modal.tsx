'use client';

import { useEffect, useState } from 'react';
import { X, Clock, Lock, Delete, Coffee, LogIn, LogOut, CheckCircle } from 'lucide-react';
import { getNowInET, formatTimeOnly } from '@/lib/timezone';
import { useLanguage } from '@/lib/language-context';
import toast from 'react-hot-toast';

interface Worker {
  id: string;
  name: string;
  employeeId: string | null;
}

interface ActiveShift {
  id: string;
  clockIn: string;
  lunchOut: string | null;
  lunchIn: string | null;
  clockOut: string | null;
}

interface ShiftSummary {
  date: string;
  clockIn: string;
  lunchOut: string | null;
  lunchIn: string | null;
  clockOut: string;
  totalHours: number;
}

type ShiftStep = 'none' | 'shift_started' | 'at_lunch' | 'back_from_lunch' | 'completed';

interface ClockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClockModal({ isOpen, onClose }: ClockModalProps) {
  const { t } = useLanguage();
  const [resolvedWorker, setResolvedWorker] = useState<Worker | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [step, setStep] = useState<ShiftStep>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPinVerified(false);
      setPin('');
      setPinError('');
      setResolvedWorker(null);
      setActiveShift(null);
      setStep('none');
      setShiftSummary(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (pinVerified && resolvedWorker) {
      checkActiveShift(resolvedWorker.id);
    }
  }, [pinVerified, resolvedWorker]);

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setPinError('');
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handlePinDelete = () => {
    setPin(pin.slice(0, -1));
    setPinError('');
  };

  const verifyPin = async (enteredPin: string) => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/workers/identify-by-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin }),
      });

      if (response.ok) {
        const worker = await response.json();
        setResolvedWorker(worker);
        setPinVerified(true);
      } else {
        const data = await response.json();
        setPinError(response.status === 409 ? data.error : t('incorrectPin'));
        setPin('');
      }
    } catch {
      setPinError(t('verificationFailed'));
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const checkActiveShift = async (workerId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/time-entries/active?workerId=${workerId}`);
      if (response.ok) {
        const data = await response.json();
        setActiveShift(data.activeShift);
        setStep(data.step);
      }
    } catch {
      // silent — shift defaults to 'none'
    } finally {
      setIsLoading(false);
    }
  };

  const runPunch = async (url: string, options: RequestInit, successMsg: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        toast.success(`${resolvedWorker!.name} ${successMsg}`);
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || t('failedAction'));
      }
    } catch {
      toast.error(t('failedAction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShiftStart = () => {
    if (!resolvedWorker) return;
    runPunch(
      '/api/time-entries',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workerId: resolvedWorker.id, clockIn: getNowInET().toISOString() }) },
      t('clockedInSuccess')
    );
  };

  const handlePunch = (action: string, successMsg: string) => {
    if (!activeShift || !resolvedWorker) return;
    runPunch(
      `/api/time-entries/${activeShift.id}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, timestamp: getNowInET().toISOString() }) },
      successMsg
    );
  };

  const handleShiftEnd = async () => {
    if (!activeShift || !resolvedWorker) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/time-entries/${activeShift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'shiftEnd', timestamp: getNowInET().toISOString() }),
      });
      if (response.ok) {
        const entry = await response.json();
        setShiftSummary({
          date: entry.date,
          clockIn: entry.clockIn,
          lunchOut: entry.lunchOut ?? null,
          lunchIn: entry.lunchIn ?? null,
          clockOut: entry.clockOut,
          totalHours: entry.totalHours ?? 0,
        });
      } else {
        const error = await response.json();
        toast.error(error.error || t('failedAction'));
      }
    } catch {
      toast.error(t('failedAction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const stepConfig: Record<string, { label: string; color: string; icon: React.ElementType; action: () => void }> = {
    shift_started: {
      label: t('lunchOut'),
      color: 'bg-orange-500 hover:bg-orange-600',
      icon: Coffee,
      action: () => handlePunch('lunchOut', t('lunchOutSuccess')),
    },
    at_lunch: {
      label: t('lunchIn'),
      color: 'bg-green-600 hover:bg-green-700',
      icon: LogIn,
      action: () => handlePunch('lunchIn', t('lunchInSuccess')),
    },
    back_from_lunch: {
      label: t('shiftEnd'),
      color: 'bg-red-600 hover:bg-red-700',
      icon: LogOut,
      action: handleShiftEnd,
    },
  };

  const currentStepConfig = step !== 'none' && step !== 'completed' ? stepConfig[step] : null;

  const stepOrder: ShiftStep[] = ['shift_started', 'at_lunch', 'back_from_lunch', 'completed'];
  const stepLabels = [t('shiftStart'), t('lunchOut'), t('lunchIn'), t('shiftEnd')];
  const currentStepIndex = stepOrder.indexOf(step);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {shiftSummary ? t('shiftSummary') : resolvedWorker ? resolvedWorker.name : t('enterPin')}
            </h2>
            {!shiftSummary && resolvedWorker?.employeeId && (
              <p className="text-sm text-gray-500 mt-1">{resolvedWorker.employeeId}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {shiftSummary ? (
          <div>
            <div className="flex flex-col items-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
              <p className="text-gray-500 text-sm">{shiftSummary.date}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('shiftStart')}</span>
                <span className="font-medium text-gray-800">{formatTimeOnly(shiftSummary.clockIn)}</span>
              </div>
              {shiftSummary.lunchOut && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('lunchOut')}</span>
                  <span className="font-medium text-orange-600">{formatTimeOnly(shiftSummary.lunchOut)}</span>
                </div>
              )}
              {shiftSummary.lunchIn && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('lunchIn')}</span>
                  <span className="font-medium text-green-600">{formatTimeOnly(shiftSummary.lunchIn)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('shiftEnd')}</span>
                <span className="font-medium text-gray-800">{formatTimeOnly(shiftSummary.clockOut)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-semibold text-gray-700">{t('totalHoursWorked')}</span>
                <span className="text-2xl font-bold text-blue-600">{shiftSummary.totalHours.toFixed(2)}h</span>
              </div>
            </div>

            <button
              onClick={() => { toast.success(`${resolvedWorker!.name} ${t('clockedOutSuccess')}`); onClose(); }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors text-lg"
            >
              {t('confirmShift')}
            </button>
          </div>
        ) : !pinVerified ? (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full transition-all duration-200 ${
                    i < pin.length ? 'bg-blue-600 scale-110' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-red-500 text-center text-sm mb-4 font-medium">{pinError}</p>
            )}

            {isVerifying && (
              <div className="text-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
                if (key === '') return <div key="empty" />;
                if (key === 'del') {
                  return (
                    <button
                      key="del"
                      onClick={handlePinDelete}
                      disabled={isVerifying}
                      className="h-16 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <Delete className="w-6 h-6 text-gray-600" />
                    </button>
                  );
                }
                return (
                  <button
                    key={key}
                    onClick={() => handlePinDigit(key)}
                    disabled={isVerifying || pin.length >= 4}
                    className="h-16 rounded-xl bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-2xl font-semibold text-gray-800 transition-colors disabled:opacity-50 border border-gray-200"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">{t('loading')}</p>
          </div>
        ) : step === 'none' ? (
          <div>
            <button
              onClick={handleShiftStart}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xl"
            >
              {isSubmitting ? (
                <span>{t('processing')}</span>
              ) : (
                <>
                  <Clock className="w-7 h-7" />
                  <span>{t('shiftStart')}</span>
                </>
              )}
            </button>
          </div>
        ) : currentStepConfig ? (
          <div>
            <div className="flex items-center justify-center gap-2 mb-5">
              {stepLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        i < currentStepIndex
                          ? 'bg-green-500'
                          : i === currentStepIndex
                          ? 'bg-blue-600 ring-4 ring-blue-100'
                          : 'bg-gray-200'
                      }`}
                    />
                    <span className="text-[10px] text-gray-500 mt-1 whitespace-nowrap">{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`w-6 h-0.5 mb-4 ${i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <p className="font-semibold text-blue-800 text-sm">{t('activeShift')}</p>
              </div>
              {activeShift && (
                <>
                  <p className="text-xs text-blue-700">
                    {t('startedAt')} {formatTimeOnly(activeShift.clockIn)}
                  </p>
                  {activeShift.lunchOut && (
                    <p className="text-xs text-orange-600">
                      {t('lunchAt')} {formatTimeOnly(activeShift.lunchOut)}
                    </p>
                  )}
                  {activeShift.lunchIn && (
                    <p className="text-xs text-green-600">
                      {t('backAt')} {formatTimeOnly(activeShift.lunchIn)}
                    </p>
                  )}
                </>
              )}
            </div>

            <button
              onClick={currentStepConfig.action}
              disabled={isSubmitting}
              className={`w-full ${currentStepConfig.color} text-white font-semibold py-5 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xl`}
            >
              {isSubmitting ? (
                <span>{t('processing')}</span>
              ) : (
                <>
                  <currentStepConfig.icon className="w-7 h-7" />
                  <span>{currentStepConfig.label}</span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
