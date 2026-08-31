import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { CalendarDays, CheckCircle2, FileText } from 'lucide-react';
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

const leaveRequestSchema = z.object({
  leaveType: z.enum(['annual', 'sick', 'personal', 'emergency'], {
    required_error: 'Select a leave type.',
  }),
  startDate: z.string().min(1, 'Select a start date.'),
  endDate: z.string().min(1, 'Select an end date.'),
  reason: z.string().trim().min(10, 'Add at least 10 characters explaining your request.').max(500, 'Reason must be 500 characters or fewer.'),
}).superRefine((request, context) => {
  const start = new Date(`${request.startDate}T00:00:00`);
  const end = new Date(`${request.endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
  if (end < start) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date must be on or after the start date.' });
  }
});

type LeaveRequest = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
};

const leaveLabels = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  personal: 'Personal leave',
  emergency: 'Emergency leave',
} as const;

export default function LeaveManagementForm() {
  const [form, setForm] = useState<LeaveRequest>({ leaveType: '', startDate: '', endDate: '', reason: '' });
  const [submittedRequest, setSubmittedRequest] = useState<z.infer<typeof leaveRequestSchema> | null>(null);
  const { toast } = useToast();

  const updateField = (field: keyof LeaveRequest, value: string) => {
    setSubmittedRequest(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = leaveRequestSchema.safeParse(form);

    if (!result.success) {
      toast({ title: 'Review your leave request', description: result.error.issues[0]?.message ?? 'Complete all required fields.', variant: 'destructive' });
      return;
    }

    setSubmittedRequest(result.data);
    toast({ title: 'Leave request submitted', description: 'Your supervisor will review the request shortly.' });
    setForm({ leaveType: '', startDate: '', endDate: '', reason: '' });
  };

  return (
    <section className="ops-card p-5" aria-labelledby="leave-management-title">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-primary">People services</p>
            <h2 id="leave-management-title" className="font-display text-base font-semibold text-foreground">Leave management</h2>
            <p className="mt-1 text-xs text-muted-foreground">Request time away and track supervisor approval.</p>
          </div>
        </div>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>

      {submittedRequest ? (
        <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Request pending approval</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {leaveLabels[submittedRequest.leaveType]} · {submittedRequest.startDate} to {submittedRequest.endDate}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setSubmittedRequest(null)}>
            Submit another request
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="leave-type" className="mb-2 block text-xs font-semibold text-foreground">Leave type</label>
            <Select value={form.leaveType} onValueChange={(value) => updateField('leaveType', value)}>
              <SelectTrigger id="leave-type" aria-label="Leave type">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual leave</SelectItem>
                <SelectItem value="sick">Sick leave</SelectItem>
                <SelectItem value="personal">Personal leave</SelectItem>
                <SelectItem value="emergency">Emergency leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="leave-start" className="mb-2 block text-xs font-semibold text-foreground">Start date</label>
              <input id="leave-start" type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label htmlFor="leave-end" className="mb-2 block text-xs font-semibold text-foreground">End date</label>
              <input id="leave-end" type="date" value={form.endDate} onChange={(event) => updateField('endDate', event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div>
            <label htmlFor="leave-reason" className="mb-2 block text-xs font-semibold text-foreground">Reason</label>
            <Textarea id="leave-reason" value={form.reason} onChange={(event) => updateField('reason', event.target.value)} maxLength={500} placeholder="Briefly explain the reason for your leave request" className="min-h-24" />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{form.reason.length}/500</p>
          </div>

          <Button type="submit" className="w-full sm:w-auto">Submit leave request</Button>
        </form>
      )}
    </section>
  );
}