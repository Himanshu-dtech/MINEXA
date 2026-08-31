import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { z } from 'zod';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'minexa-leave-requests';

const leaveRequestSchema = z
  .object({
    leaveType: z.enum(['annual', 'sick', 'personal', 'emergency'], {
      required_error: 'Select a leave type.',
    }),
    startDate: z.string().min(1, 'Select a start date.'),
    endDate: z.string().min(1, 'Select an end date.'),
    reason: z
      .string()
      .trim()
      .min(10, 'Add at least 10 characters explaining your request.')
      .max(500, 'Reason must be 500 characters or fewer.'),
  })
  .superRefine((request, context) => {
    const start = new Date(`${request.startDate}T00:00:00`);
    const end = new Date(`${request.endDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return;
    }

    if (end < start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be on or after the start date.',
      });
    }
  });

type LeaveType = 'annual' | 'sick' | 'personal' | 'emergency';

type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

type LeaveRequest = {
  id: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
};

type LeaveForm = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
};

const leaveLabels: Record<LeaveType, string> = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  personal: 'Personal leave',
  emergency: 'Emergency leave',
};

const leaveBalances: Record<
  LeaveType,
  { total: number; used: number }
> = {
  annual: { total: 20, used: 6 },
  sick: { total: 10, used: 2 },
  personal: { total: 5, used: 1 },
  emergency: { total: 3, used: 0 },
};

const initialForm: LeaveForm = {
  leaveType: '',
  startDate: '',
  endDate: '',
  reason: '',
};

const getWorkingDays = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  if (end < start) {
    return 0;
  }

  let days = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();

    // Monday-Friday only
    if (day !== 0 && day !== 6) {
      days += 1;
    }

    current.setDate(current.getDate() + 1);
  }

  return days;
};

const formatDate = (date: string) => {
  if (!date) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
};

const getStatusStyles = (status: LeaveStatus) => {
  switch (status) {
    case 'approved':
      return 'bg-primary/10 text-primary border-primary/20';

    case 'rejected':
      return 'bg-safety-danger/10 text-safety-danger border-safety-danger/20';

    case 'cancelled':
      return 'bg-muted text-muted-foreground border-border';

    default:
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  }
};

export default function LeaveManagementForm() {
  const [form, setForm] = useState<LeaveForm>(initialForm);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);

  const { toast } = useToast();

  // Load requests from localStorage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setRequests(parsed);
      }
    } catch (error) {
      console.error('Unable to load leave requests:', error);
    }
  }, []);

  // Save requests whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch (error) {
      console.error('Unable to save leave requests:', error);
    }
  }, [requests]);

  const duration = useMemo(
    () => getWorkingDays(form.startDate, form.endDate),
    [form.startDate, form.endDate],
  );

  const updateField = (field: keyof LeaveForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const selectedBalance =
    form.leaveType && form.leaveType in leaveBalances
      ? leaveBalances[form.leaveType as LeaveType]
      : null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = leaveRequestSchema.safeParse(form);

    if (!result.success) {
      toast({
        title: 'Review your leave request',
        description:
          result.error.issues[0]?.message ??
          'Complete all required fields.',
        variant: 'destructive',
      });

      return;
    }

    const requestDays = getWorkingDays(
      result.data.startDate,
      result.data.endDate,
    );

    if (requestDays === 0) {
      toast({
        title: 'Invalid leave duration',
        description: 'Select at least one working day.',
        variant: 'destructive',
      });

      return;
    }

    const balance = leaveBalances[result.data.leaveType];

    const pendingOrApprovedDays = requests
      .filter(
        (request) =>
          request.leaveType === result.data.leaveType &&
          (request.status === 'pending' ||
            request.status === 'approved'),
      )
      .reduce((sum, request) => sum + request.days, 0);

    const remaining = balance.total - balance.used - pendingOrApprovedDays;

    if (requestDays > remaining) {
      toast({
        title: 'Insufficient leave balance',
        description: `Only ${remaining} day(s) are available for this leave type.`,
        variant: 'destructive',
      });

      return;
    }

    const newRequest: LeaveRequest = {
      id: crypto.randomUUID(),
      leaveType: result.data.leaveType,
      startDate: result.data.startDate,
      endDate: result.data.endDate,
      days: requestDays,
      reason: result.data.reason,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    setRequests((current) => [newRequest, ...current]);

    setForm(initialForm);
    setShowForm(false);

    toast({
      title: 'Leave request submitted',
      description: `${requestDays} working day(s) added to your pending requests.`,
    });
  };

  const cancelRequest = (id: string) => {
    setRequests((current) =>
      current.map((request) =>
        request.id === id
          ? {
              ...request,
              status: 'cancelled',
            }
          : request,
      ),
    );

    toast({
      title: 'Leave request cancelled',
      description: 'The pending leave request has been cancelled.',
    });
  };

  const getRemainingBalance = (type: LeaveType) => {
    const base =
      leaveBalances[type].total - leaveBalances[type].used;

    const reserved = requests
      .filter(
        (request) =>
          request.leaveType === type &&
          (request.status === 'pending' ||
            request.status === 'approved'),
      )
      .reduce((sum, request) => sum + request.days, 0);

    return Math.max(base - reserved, 0);
  };

  return (
    <section
      className="space-y-6"
      aria-labelledby="leave-management-title"
    >
      {/* Header */}
      <div className="ops-card p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="h-4 w-4" />
            </span>

            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-primary">
                People services
              </p>

              <h2
                id="leave-management-title"
                className="font-display text-base font-semibold text-foreground"
              >
                Leave management
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Apply for leave and track supervisor approval.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setShowForm((current) => !current)}
            className="gap-2"
          >
            {showForm ? (
              <>
                <XCircle className="h-4 w-4" />
                Close
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Apply for leave
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Leave balance */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(leaveBalances) as LeaveType[]).map(
          (type) => {
            const remaining = getRemainingBalance(type);
            const total = leaveBalances[type].total;
            const used = total - remaining;

            return (
              <div
                key={type}
                className="ops-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                      {leaveLabels[type]}
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {remaining}
                    </p>

                    <p className="text-[11px] text-muted-foreground">
                      remaining of {total} days
                    </p>
                  </div>

                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(
                        (used / total) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* Apply form */}
      {showForm && (
        <div className="ops-card p-5">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">
              New request
            </p>

            <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
              Apply for leave
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              Your request will be sent to your supervisor for review.
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={handleSubmit}
            noValidate
          >
            <div>
              <label
                htmlFor="leave-type"
                className="mb-2 block text-xs font-semibold text-foreground"
              >
                Leave type
              </label>

              <Select
                value={form.leaveType}
                onValueChange={(value) =>
                  updateField('leaveType', value)
                }
              >
                <SelectTrigger id="leave-type">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="annual">
                    Annual leave
                  </SelectItem>

                  <SelectItem value="sick">
                    Sick leave
                  </SelectItem>

                  <SelectItem value="personal">
                    Personal leave
                  </SelectItem>

                  <SelectItem value="emergency">
                    Emergency leave
                  </SelectItem>
                </SelectContent>
              </Select>

              {selectedBalance && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {getRemainingBalance(
                    form.leaveType as LeaveType,
                  )}{' '}
                  day(s) currently available.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="leave-start"
                  className="mb-2 block text-xs font-semibold text-foreground"
                >
                  Start date
                </label>

                <input
                  id="leave-start"
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    updateField('startDate', event.target.value)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label
                  htmlFor="leave-end"
                  className="mb-2 block text-xs font-semibold text-foreground"
                >
                  End date
                </label>

                <input
                  id="leave-end"
                  type="date"
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(event) =>
                    updateField('endDate', event.target.value)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {duration > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">
                      Leave duration
                    </p>

                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {duration}{' '}
                      {duration === 1 ? 'working day' : 'working days'}
                    </p>
                  </div>

                  <Clock3 className="h-5 w-5 text-primary" />
                </div>

                <p className="mt-2 text-[11px] text-muted-foreground">
                  Weekends are excluded from the calculation.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="leave-reason"
                className="mb-2 block text-xs font-semibold text-foreground"
              >
                Reason
              </label>

              <Textarea
                id="leave-reason"
                value={form.reason}
                onChange={(event) =>
                  updateField('reason', event.target.value)
                }
                maxLength={500}
                placeholder="Briefly explain the reason for your leave request"
                className="min-h-28"
              />

              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {form.reason.length}/500
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Submit leave request
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(initialForm);
                  setShowForm(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Request history */}
      <div className="ops-card p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">
              History
            </p>

            <h3 className="mt-1 font-display text-base font-semibold">
              My leave requests
            </h3>
          </div>

          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>

        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <CalendarDays className="mx-auto h-7 w-7 text-muted-foreground" />

            <p className="mt-3 text-sm font-semibold text-foreground">
              No leave requests yet
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Your submitted leave requests will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-border bg-background/30 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {leaveLabels[request.leaveType]}
                      </p>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusStyles(
                          request.status,
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(request.startDate)} →{' '}
                      {formatDate(request.endDate)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.days}{' '}
                      {request.days === 1 ? 'working day' : 'working days'}
                      {' • '}
                      Submitted{' '}
                      {new Intl.DateTimeFormat('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      }).format(new Date(request.submittedAt))}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {request.reason}
                    </p>
                  </div>

                  {request.status === 'pending' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cancelRequest(request.id)}
                    >
                      Cancel request
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo note */}
      <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

          <div>
            <p className="text-xs font-semibold text-foreground">
              Frontend mode
            </p>

            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Requests are currently stored locally in your browser.
              When MINEXA gets its NestJS + PostgreSQL backend, this
              storage layer will be replaced with real API calls.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}