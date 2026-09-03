import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getCurrentUser,
  loginUser,
  registerUser,
  getMines,
} from '@/lib/api';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Download,
  FileBarChart,
  FileText,
  Filter,
  Gauge,
  HardHat,
  Laptop,
  Layers3,
  LineChart,
  LogOut,
  Map,
  MapPin,
  Menu,
  MessageSquareWarning,
  Minus,
  MonitorCog,
  MoreHorizontal,
  MousePointer2,
  Plus,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Target,
  Thermometer,
  Truck,
  Users,
  Wrench,
  X,
  Zap,
  HeartPulse,
  UserCheck,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import heroBg from '@/assets/hero-bg.jpg';
import LeaveManagementForm from '@/components/LeaveManagementForm';
import WorkerHealth from './WorkerHealth';
import AdminApprovalCenter from './AdminApprovalCenter';
import ManagerApprovalCenter from './ManagerApprovalCenter';
import SafetyVerificationCenter from './SafetyVerificationCenter';

type Role = 'admin' | 'manager' | 'safety' | 'worker';
type View = 'dashboard' | 'mine' | 'safety' | 'workers' | 'equipment' | 'analytics' | 'reports' | 'admin' | 'leave' | 'settings' |'health'| 'safety-verification'|'worker-approvals';
type AuthUser = {
  id: number;
  name: string;
  email: string;
  role:
    | 'PLATFORM_ADMIN'
    | 'MINE_MANAGER'
    | 'SAFETY_OFFICER'
    | 'FIELD_WORKER';
  workerId: number | null;
};
const backendRoleToAppRole: Record<
  string,
  Role
> = {
  PLATFORM_ADMIN: 'admin',
  MINE_MANAGER: 'manager',
  SAFETY_OFFICER: 'safety',
  FIELD_WORKER: 'worker',
};

const mapBackendRoleToAppRole = (
  backendRole: string,
): Role => {
  const appRole =
    backendRoleToAppRole[backendRole];

  if (!appRole) {
    throw new Error(
      `Unsupported account role: ${backendRole}`,
    );
  }

  return appRole;
};
const roleMeta: Record<Role, { label: string; description: string; icon: React.ElementType; color: string; defaultView: View }> = {
  admin: { label: 'Platform Admin', description: 'System governance & access', icon: MonitorCog, color: 'text-neonova-blue', defaultView: 'admin' },
  manager: { label: 'Mine Manager', description: 'Operations command center', icon: Building2, color: 'text-safety-success', defaultView: 'dashboard' },
  safety: { label: 'Safety Officer', description: 'Incident response & compliance', icon: ShieldCheck, color: 'text-safety-warning', defaultView: 'safety' },
  worker: { label: 'Field Worker', description: 'Personal safety & tasks', icon: HardHat, color: 'text-safety-info', defaultView: 'dashboard' },
};

const navItems: { id: View; label: string; icon: React.ElementType; section?: string }[] = [
  { id: 'dashboard', label: 'Command center', icon: Command, section: 'Workspace' },
  { id: 'mine', label: 'Live mine map', icon: Map },
  { id: 'safety', label: 'Safety & alerts', icon: ShieldCheck },
  { id: 'workers', label: 'Workforce', icon: Users },

{
  id: 'worker-approvals',
  label: 'Worker approvals',
  icon: UserCheck,
  section: 'Workforce',
},
{
  id: 'safety-verification',
  label: 'Safety verification',
  icon: ShieldCheck,
  section: 'Safety',
},
  { id: 'equipment', label: 'Equipment', icon: Truck },
  { id: 'analytics', label: 'Analytics', icon: LineChart, section: 'Insights' },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'admin', label: 'Administration', icon: Settings, section: 'System' },
  { id: 'leave', label: 'Leave management', icon: CalendarDays, section: 'My work' },
  {
  id: 'health',
  label: 'Health & Fitness',
  icon: HeartPulse,
  section: 'Worker services',
},

];

const roleAccess: Record<Role, View[]> = {
  admin: ['dashboard', 'workers', 'analytics', 'reports', 'admin', 'settings'],
  manager: ['dashboard', 'mine', 'safety', 'workers', 'equipment', 'analytics', 'reports', 'settings','worker-approvals',],
  safety: ['dashboard', 'mine', 'safety', 'workers', 'analytics', 'reports', 'settings','safety-verification'],
  worker: ['dashboard', 'leave', 'settings','health'],
};

const alerts = [
  { id: 1, severity: 'critical', title: 'Gas concentration above threshold', location: 'Zone B · Tunnel 03', time: '2 min ago', reading: '4.8% CH₄', score: 92, workers: 12, action: 'Evacuate Zone B and dispatch response team.' },
  { id: 2, severity: 'warning', title: 'High temperature detected', location: 'Crusher Bay · Sensor T-18', time: '18 min ago', reading: '68°C', score: 64, workers: 4, action: 'Inspect cooling system within 15 minutes.' },
  { id: 3, severity: 'warning', title: 'Worker inactive for 22 minutes', location: 'North Ramp · John D.', time: '31 min ago', reading: 'No motion', score: 58, workers: 1, action: 'Contact worker and verify location.' },
  { id: 4, severity: 'info', title: 'High vibration detected', location: 'Haul Road · Truck TR-08', time: '46 min ago', reading: '7.2 mm/s', score: 38, workers: 0, action: 'Schedule equipment inspection before next shift.' },
];

const workers = [
  { id: 'NW-0428', name: 'Arjun Mehta', role: 'Drill Operator', zone: 'Zone A', status: 'On site', lastSeen: 'Just now', score: 98, shift: 'A · 06:00–14:00' },
  { id: 'NW-0391', name: 'Priya Sharma', role: 'Safety Technician', zone: 'Zone B', status: 'On site', lastSeen: '2 min ago', score: 96, shift: 'A · 06:00–14:00' },
  { id: 'NW-0512', name: 'John Dsouza', role: 'Haul Truck Driver', zone: 'North Ramp', status: 'Review', lastSeen: '31 min ago', score: 74, shift: 'A · 06:00–14:00' },
  { id: 'NW-0286', name: 'Kavita Rao', role: 'Geologist', zone: 'Zone C', status: 'On site', lastSeen: '8 min ago', score: 99, shift: 'B · 14:00–22:00' },
  { id: 'NW-0447', name: 'Ravi Kumar', role: 'Maintenance Lead', zone: 'Workshop', status: 'On site', lastSeen: '12 min ago', score: 91, shift: 'A · 06:00–14:00' },
  { id: 'NW-0634', name: 'Neha Verma', role: 'Blasting Supervisor', zone: 'Zone D', status: 'Off site', lastSeen: 'Yesterday', score: 93, shift: 'C · 22:00–06:00' },
];

const equipment = [
  { id: 'TR-08', name: 'Caterpillar 777G', type: 'Haul truck', zone: 'North Ramp', status: 'Operational', health: 94, maintenance: '12 Jun 2025', temp: '71°C', vibration: '7.2 mm/s' },
  { id: 'EX-14', name: 'Komatsu PC490', type: 'Excavator', zone: 'Zone A', status: 'Operational', health: 88, maintenance: '02 Jun 2025', temp: '64°C', vibration: '3.8 mm/s' },
  { id: 'DR-03', name: 'Sandvik DL422i', type: 'Drill rig', zone: 'Zone B', status: 'Maintenance', health: 62, maintenance: 'In progress', temp: '—', vibration: '—' },
  { id: 'LD-07', name: 'Volvo L220H', type: 'Wheel loader', zone: 'Crusher Bay', status: 'Operational', health: 91, maintenance: '28 May 2025', temp: '68°C', vibration: '2.4 mm/s' },
  { id: 'WT-02', name: 'Water Cart 777', type: 'Support vehicle', zone: 'Zone C', status: 'Out of service', health: 24, maintenance: 'Overdue', temp: '—', vibration: '—' },
];

const trendData = [
  { day: '06 Jun', risk: 31, incidents: 2, productivity: 72 }, { day: '07 Jun', risk: 28, incidents: 1, productivity: 76 },
  { day: '08 Jun', risk: 34, incidents: 3, productivity: 69 }, { day: '09 Jun', risk: 22, incidents: 1, productivity: 82 },
  { day: '10 Jun', risk: 26, incidents: 2, productivity: 79 }, { day: '11 Jun', risk: 19, incidents: 0, productivity: 86 },
  { day: '12 Jun', risk: 24, incidents: 1, productivity: 84 },
];

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

function LogoMark({ light = false }: { light?: boolean }) {
  return <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/.25)]"><Zap className="h-5 w-5 fill-current" /></div><div><div className={cx('font-display text-lg font-semibold tracking-[0.14em]', light ? 'text-foreground' : 'text-foreground')}>NEONOVA</div><div className="text-[9px] font-medium uppercase tracking-[0.19em] text-muted-foreground">Mine intelligence</div></div></div>;
}

function StatusDot({ status }: { status: 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className={cx('inline-block h-2 w-2 rounded-full', `bg-safety-${status}`)} />;
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', tone === 'neutral' ? 'border-border bg-secondary text-muted-foreground' : `border-safety-${tone}/25 bg-safety-${tone}/10 text-safety-${tone}`)}>{children}</span>;
}

function MetricCard({ label, value, change, trend, icon: Icon, tone = 'primary' }: { label: string; value: string; change: string; trend: 'up' | 'down' | 'flat'; icon: React.ElementType; tone?: 'primary' | 'success' | 'warning' | 'info' | 'danger' }) {
  const toneClass = tone === 'primary' ? 'text-primary' : `text-safety-${tone}`;
  return <div className="ops-card group p-5 transition-transform hover:-translate-y-0.5">
    <div className="mb-5 flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><Icon className={cx('h-[18px] w-[18px]', toneClass)} /></span><span className={cx('flex items-center gap-1 text-[11px] font-semibold', trend === 'down' ? 'text-safety-danger' : trend === 'flat' ? 'text-muted-foreground' : 'text-safety-success')}>{trend === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> : trend === 'down' ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}{change}</span></div>
    <p className="text-xs font-medium text-muted-foreground">{label}</p><div className="mt-1 flex items-baseline gap-2"><p className="font-display text-2xl font-semibold tracking-tight text-foreground">{value}</p></div>
  </div>;
}

function PanelTitle({ icon: Icon, eyebrow, title, action }: { icon: React.ElementType; eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><div>{eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}<h2 className="font-display text-base font-semibold text-foreground">{title}</h2></div></div>{action}</div>;
}

function Landing({ onExplore, onDemo }: { onExplore: () => void; onDemo: () => void }) {
  return <div className="min-h-screen bg-background text-foreground">
    <header className="absolute inset-x-0 top-0 z-20"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 lg:px-10"><LogoMark light /><nav className="hidden items-center gap-8 text-xs font-medium text-muted-foreground lg:flex"><a href="#platform" className="transition-colors hover:text-foreground">Platform</a><a href="#signals" className="transition-colors hover:text-foreground">Operations</a><a href="#enterprise" className="transition-colors hover:text-foreground">Enterprise</a></nav><div className="flex items-center gap-3"><Button variant="ghost" size="sm" onClick={onExplore} className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">Sign in</Button><Button size="sm" onClick={onExplore}>Explore platform <ChevronRight className="h-4 w-4" /></Button></div></div></header>
    <main>
      <section className="relative min-h-[720px] overflow-hidden border-b border-border/60 lg:min-h-[780px]"><img src={heroBg} alt="Open pit mine operations" className="absolute inset-0 h-full w-full object-cover object-center opacity-35" /><div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--background))_0%,hsl(var(--background)/.92)_38%,hsl(var(--background)/.38)_100%)]" /><div className="relative mx-auto grid min-h-[720px] max-w-[1440px] items-center px-5 pb-12 pt-28 lg:min-h-[780px] lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:px-10"><div className="max-w-2xl"><Badge tone="success"><span className="live-pulse"><StatusDot status="success" /></span> Platform telemetry live</Badge><h1 className="mt-7 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-[72px]">Intelligent mine safety <span className="text-primary">& operations.</span></h1><p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Real-time monitoring, AI-powered risk prediction, and faster response for safer mining.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button size="lg" onClick={onExplore}>Explore platform <ArrowUpRight className="h-4 w-4" /></Button><Button size="lg" variant="outline" onClick={onDemo}><MousePointer2 className="h-4 w-4" /> Watch demo</Button></div><div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-border/60 pt-5 text-[11px] font-medium text-muted-foreground"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> ISO-ready workflows</span><span className="flex items-center gap-2"><RadioTower className="h-4 w-4 text-primary" /> 24/7 telemetry</span><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Role-based access</span></div></div><div className="relative mt-10 lg:mt-24"><div className="absolute -inset-5 rounded-3xl border border-primary/10 bg-primary/5 blur-2xl" /><div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface/95 shadow-2xl backdrop-blur-md"><div className="flex items-center justify-between border-b border-border/60 px-4 py-3"><div className="flex items-center gap-2 text-[11px] font-semibold"><span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" /> Live operations snapshot</div><span className="text-[10px] text-muted-foreground">12 Jun 2025 · 18:42:08</span></div><div className="grid grid-cols-[1.15fr_.85fr] gap-px bg-border/60"><div className="relative min-h-[280px] overflow-hidden bg-[#0d1920] p-4"><div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(hsl(var(--primary)/.09) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/.09) 1px, transparent 1px)', backgroundSize: '34px 34px' }} /><div className="relative flex items-center justify-between"><span className="rounded bg-background/80 px-2 py-1 text-[10px] font-semibold text-foreground">Pit 04 · Active view</span><Badge tone="success"><StatusDot status="success" /> Stable</Badge></div><div className="relative mt-5 h-48"><svg viewBox="0 0 500 220" className="h-full w-full"><path d="M20 174 L105 126 L145 139 L204 83 L265 111 L318 52 L400 87 L475 30" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity=".9" /><path d="M20 193 L109 153 L158 166 L210 111 L270 136 L321 78 L406 110 L475 57" fill="none" stroke="hsl(var(--secondary))" strokeWidth="1.5" opacity=".5" /><path d="M62 182 L121 143 L179 158 L233 103 L291 127 L343 70 L427 102" fill="none" stroke="hsl(var(--primary)/.25)" strokeWidth="22" /><circle cx="204" cy="83" r="6" fill="hsl(var(--primary))" /><circle cx="318" cy="52" r="6" fill="hsl(var(--danger))" /><circle cx="400" cy="87" r="6" fill="hsl(var(--warning))" /><circle cx="145" cy="139" r="5" fill="hsl(var(--secondary))" /><circle cx="204" cy="83" r="12" fill="none" stroke="hsl(var(--primary)/.35)" /></svg></div><div className="relative flex items-center gap-4 text-[9px] text-muted-foreground"><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-primary" /> sensors 86</span><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-secondary" /> workers 1,248</span><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-safety-danger" /> critical 01</span></div></div><div className="bg-surface p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Safety index</p><div className="mt-4 flex items-center gap-3"><div className="relative flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'conic-gradient(hsl(var(--primary)) 0 94.2%, hsl(var(--secondary)) 94.2% 100%)' }}><div className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-surface"><span className="font-display text-lg font-semibold">94.2</span></div></div><div><p className="text-xs font-semibold text-primary">Excellent</p><p className="mt-1 text-[10px] text-muted-foreground">+2.4% vs last week</p></div></div><div className="mt-8 space-y-3"><div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Equipment uptime</span><b>93.4%</b></div><div className="h-1.5 rounded-full bg-secondary"><div className="h-full w-[93%] rounded-full bg-primary" /></div><div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Sensors online</span><b>98.7%</b></div><div className="h-1.5 rounded-full bg-secondary"><div className="h-full w-[98%] rounded-full bg-secondary" /></div></div></div></div></div></div></div></section>
      <section id="signals" className="border-b border-border/60 bg-surface/35"><div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-border/60 px-5 lg:grid-cols-4 lg:px-10"><div className="px-4 py-7 first:pl-0"><p className="font-display text-2xl font-semibold">94.2%</p><p className="mt-1 text-[11px] text-muted-foreground">Overall safety score</p></div><div className="px-4 py-7 lg:px-8"><p className="font-display text-2xl font-semibold">1,248</p><p className="mt-1 text-[11px] text-muted-foreground">Workers on-site</p></div><div className="px-4 py-7 lg:px-8"><p className="font-display text-2xl font-semibold">86<span className="text-muted-foreground">/92</span></p><p className="mt-1 text-[11px] text-muted-foreground">Equipment operational</p></div><div className="px-4 py-7 lg:pl-8"><p className="font-display text-2xl font-semibold text-primary">98.7%</p><p className="mt-1 text-[11px] text-muted-foreground">Sensors online</p></div></div></section>
      <section id="platform" className="mx-auto max-w-[1440px] px-5 py-24 lg:px-10"><div className="max-w-xl"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-primary">One operational truth</p><h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">From first signal to safer decisions.</h2><p className="mt-4 leading-7 text-muted-foreground">NEONOVA connects every layer of mine operations so teams can move from monitor to respond with clarity.</p></div><div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-4">{[['01', 'Predict risk', 'See risk patterns before they become incidents.', Sparkles, 'text-primary'], ['02', 'Monitor everything', 'One clear view across people, places, and machines.', Activity, 'text-secondary'], ['03', 'Respond faster', 'Route the right action to the right team, instantly.', Zap, 'text-safety-warning'], ['04', 'Improve productivity', 'Turn operational data into measurable momentum.', Target, 'text-safety-success']].map(([number, title, copy, Icon, color]) => <div key={number as string} className="bg-surface p-7 transition-colors hover:bg-surface-secondary"><span className="font-mono text-xs text-muted-foreground">/{number as string}</span><div className={cx('mt-10', color as string)}>{React.createElement(Icon as React.ElementType, { className: 'h-6 w-6' })}</div><h3 className="mt-5 font-display text-lg font-semibold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy as string}</p></div>)}</div></section>
      <section id="enterprise" className="border-t border-border/60 bg-surface/35"><div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 px-5 py-20 lg:flex-row lg:items-center lg:px-10"><div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-primary">Built for the shift ahead</p><h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight">Make every shift safer, smarter, and more accountable.</h2></div><Button size="lg" onClick={onExplore}>Enter the command center <ArrowUpRight className="h-4 w-4" /></Button></div></section>
    </main><footer className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10"><LogoMark /><span>© 2025 NEONOVA Technologies · Intelligent mine operations</span></footer>
  </div>;
}

function Login({
  onLogin,
  onSignup,
}: {
  onLogin: (role: Role, user: AuthUser) => void;
  onSignup: () => void;
}) {
 const [email, setEmail] = useState('');
const [password, setPassword] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const { toast } = useToast();

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');

    if (!email.trim() || !password) {
      setError(
        'Please enter your email and password.',
      );
      return;
    }

    try {
      setLoading(true);

      const data = await loginUser(
        email.trim(),
        password,
      );

      let appRole: Role;

switch (data.user.role) {
  case 'PLATFORM_ADMIN':
    appRole = 'admin';
    break;

  case 'MINE_MANAGER':
    appRole = 'manager';
    break;

  case 'SAFETY_OFFICER':
    appRole = 'safety';
    break;

  case 'FIELD_WORKER':
    appRole = 'worker';
    break;

  default:
    throw new Error(
      `Unsupported account role: ${data.user.role}`,
    );
}

      // Save authentication information
      localStorage.setItem(
        'minexa_token',
        data.token,
      );

      localStorage.setItem(
        'minexa_user',
        JSON.stringify(data.user),
      );

      // Open the correct dashboard with the authenticated user
      onLogin(appRole, {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        workerId: data.user.workerId,
      });
    } catch (err) {
      console.error(
        'Login failed:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Login failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

return (
  <div className="grid min-h-screen bg-background lg:grid-cols-[.9fr_1.1fr]">
    {/* Left panel */}
    <div className="relative hidden overflow-hidden lg:block">
      <img
        src={heroBg}
        alt="Mine operations at dusk"
        className="absolute inset-0 h-full w-full object-cover opacity-50"
      />

      <div className="absolute inset-0 bg-[linear-gradient(145deg,hsl(var(--background)/.35),hsl(var(--background)))]" />

      <div className="relative flex h-full flex-col justify-between p-10">
        <LogoMark />

        <div className="max-w-md">
          <Badge tone="success">
            <StatusDot status="success" />
            Secure operations access
          </Badge>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-tight">
            Every signal matters when safety is on the line.
          </h1>

          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            A shared operational view for the people who
            monitor, detect, predict, alert, respond, and
            analyze.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Protected by role-based access controls
        </p>
      </div>
    </div>

    {/* Login panel */}
    <div className="flex min-h-screen items-center justify-center p-5 sm:p-10">
      <div className="w-full max-w-[440px]">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <LogoMark />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-primary">
          Welcome back
        </p>

        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          Sign in to NEONOVA
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Use your work credentials to access your mine.
        </p>

        {/* Error message */}
        {error && (
          <div className="mt-6 rounded-lg border border-safety-danger/30 bg-safety-danger/10 p-3">
            <p className="text-xs leading-5 text-safety-danger">
              {error}
            </p>
          </div>
        )}

        {/* Login form */}
        <form
          className="mt-8 space-y-5"
          onSubmit={handleSubmit}
        >
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-xs font-semibold text-foreground"
            >
              Work email
            </label>

            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-foreground"
              >
                Password
              </label>

              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-[11px] text-primary"
                disabled={loading}
                onClick={() =>
                  toast({
                    title: 'Password reset requested',
                    description:
                      'A secure reset link would be sent to your work email.',
                  })
                }
              >
                Forgot password?
              </Button>
            </div>

            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-border bg-secondary accent-primary"
              disabled={loading}
            />

            <label
              htmlFor="remember"
              className="text-xs text-muted-foreground"
            >
              Keep me signed in
            </label>
          </div>

          {/* Login button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading
              ? 'Signing in...'
              : 'Continue to workspace'}

            {!loading && (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Social divider */}
        <div className="my-7 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />

          <span className="whitespace-nowrap">
            Or continue with
          </span>

          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Social login */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() =>
              toast({
                title: 'Google sign in',
                description:
                  'SSO connection is ready for your organization.',
              })
            }
          >
            <span className="font-display text-sm font-bold">
              G
            </span>

            Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() =>
              toast({
                title: 'Microsoft sign in',
                description:
                  'SSO connection is ready for your organization.',
              })
            }
          >
            <Laptop className="h-4 w-4" />

            Microsoft
          </Button>
        </div>

        {/* Signup */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          New to NEONOVA?{' '}

          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs font-medium text-primary"
            onClick={onSignup}
          >
            Create account
          </Button>
        </p>
      </div>
    </div>
  </div>
);
}
function RoleSelect({ onSelect, onBack }: { onSelect: (role: Role) => void; onBack: () => void }) {
  return <div className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-10"><div className="mx-auto max-w-5xl"><div className="flex items-center justify-between"><LogoMark /><Button variant="ghost" size="sm" onClick={onBack}><ArrowDownRight className="h-4 w-4 rotate-45" /> Back</Button></div><div className="mx-auto mt-20 max-w-2xl text-center"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-primary">Workspace access</p><h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Choose your operating view.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Your role shapes the signals, workflows, and decisions surfaced in the command center.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(Object.keys(roleMeta) as Role[]).map((role) => { const meta = roleMeta[role]; const Icon = meta.icon; return <Button key={role} variant="outline" className="group flex h-auto min-h-[220px] flex-col items-start justify-between rounded-2xl p-5 text-left hover:border-primary/60 hover:bg-surface" onClick={() => onSelect(role)}><div className="flex w-full items-start justify-between"><span className={cx('flex h-11 w-11 items-center justify-center rounded-xl bg-secondary', meta.color)}><Icon className="h-5 w-5" /></span><ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div><span><span className="block font-display text-lg font-semibold text-foreground">{meta.label}</span><span className="mt-2 block text-xs leading-5 text-muted-foreground">{meta.description}</span></span></Button>; })}</div><p className="mt-12 text-center text-xs text-muted-foreground">Need a different access level? <span className="text-primary">Contact your site administrator.</span></p></div></div>;
}

function MapSurface({ compact = false, onAlert }: { compact?: boolean; onAlert?: () => void }) {
  const [zoom, setZoom] = useState(1);
  return <div className={cx('relative overflow-hidden rounded-xl border border-border/70 bg-[#0d1920]', compact ? 'h-[260px]' : 'min-h-[520px]')}><div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(hsl(var(--primary)/.08) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/.08) 1px, transparent 1px)', backgroundSize: '38px 38px' }} /><div className="absolute inset-0 flex items-center justify-center overflow-hidden"><svg viewBox="0 0 900 500" className="h-full w-full transition-transform duration-300" style={{ transform: `scale(${zoom})` }}><path d="M24 404 L160 340 L245 355 L320 274 L432 313 L516 214 L634 257 L753 145 L878 179" fill="none" stroke="hsl(var(--primary)/.15)" strokeWidth="70" /><path d="M24 404 L160 340 L245 355 L320 274 L432 313 L516 214 L634 257 L753 145 L878 179" fill="none" stroke="hsl(var(--primary)/.7)" strokeWidth="2" /><path d="M46 460 L165 388 L274 402 L350 330 L456 361 L548 265 L662 302 L778 204 L894 235" fill="none" stroke="hsl(var(--secondary)/.4)" strokeWidth="2" /><path d="M92 323 L201 273 L290 291 L365 210 L472 243 L565 150 L682 192 L795 84" fill="none" stroke="hsl(var(--warning)/.38)" strokeWidth="2" strokeDasharray="7 7" /><path d="M20 128 L180 96 L260 130 L350 89 L457 121 L552 62 L681 110 L875 43" fill="none" stroke="hsl(var(--danger)/.25)" strokeWidth="2" /><text x="91" y="375" fill="hsl(var(--muted-foreground))" fontSize="14" fontWeight="600">ZONE A</text><text x="368" y="248" fill="hsl(var(--muted-foreground))" fontSize="14" fontWeight="600">ZONE B</text><text x="610" y="286" fill="hsl(var(--muted-foreground))" fontSize="14" fontWeight="600">ZONE C</text><text x="746" y="110" fill="hsl(var(--muted-foreground))" fontSize="14" fontWeight="600">ZONE D</text>{[[160,340,'primary'],[245,355,'secondary'],[320,274,'warning'],[516,214,'danger'],[634,257,'primary'],[753,145,'warning'],[432,313,'secondary'],[682,192,'primary']].map(([x,y,t], i) => <g key={i}><circle cx={x as number} cy={y as number} r="16" fill={`hsl(var(--${t === 'primary' ? 'primary' : t === 'secondary' ? 'secondary' : t === 'warning' ? 'warning' : 'danger'}) / .12)`} /><circle cx={x as number} cy={y as number} r="5" fill={`hsl(var(--${t === 'primary' ? 'primary' : t === 'secondary' ? 'secondary' : t === 'warning' ? 'warning' : 'danger'}))`} /><circle cx={x as number} cy={y as number} r="2" fill="hsl(var(--background))" /></g>)}</svg></div><div className="absolute inset-x-4 top-4 flex items-start justify-between"><div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2 backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Live mine map</p><p className="mt-1 text-xs text-muted-foreground">Pit 04 · 2.4 km² monitored</p></div><div className="flex gap-1.5"><Button variant="outline" size="icon" className="h-8 w-8 bg-background/80" onClick={() => setZoom(Math.min(1.5, zoom + .1))} aria-label="Zoom in"><Plus className="h-3.5 w-3.5" /></Button><Button variant="outline" size="icon" className="h-8 w-8 bg-background/80" onClick={() => setZoom(Math.max(.8, zoom - .1))} aria-label="Zoom out"><Minus className="h-3.5 w-3.5" /></Button></div></div>{!compact && <><div className="absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-lg border border-border/70 bg-background/85 px-3 py-2 text-[10px] text-muted-foreground backdrop-blur"><span className="flex items-center gap-1.5"><StatusDot status="success" /> Stable</span><span className="flex items-center gap-1.5"><StatusDot status="warning" /> Monitor</span><span className="flex items-center gap-1.5"><StatusDot status="danger" /> Critical</span><span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-secondary" /> Worker / asset</span></div><Button variant="outline" size="sm" className="absolute bottom-4 right-4 bg-background/85" onClick={onAlert}><SlidersHorizontal className="h-3.5 w-3.5" /> Filters</Button></>}</div>;
}

function DashboardView({
  role,
  onNavigate,
  onAlert,
  user,
}: {
  role: Role;
  onNavigate: (view: View) => void;
  onAlert: (alert: typeof alerts[number]) => void;
  user: AuthUser | null;
}) {
  if (role === 'worker') {
  return (
    <WorkerMobileView
      onNavigate={onNavigate}
      user={user}
    />
  );
}
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs text-muted-foreground">Thursday, 12 June 2025 · Shift A</p><h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Good evening, Operator</h1><p className="mt-2 text-sm text-muted-foreground">Here’s the operational picture for <span className="text-foreground">Pit 04</span>.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => onNavigate('reports')}><Download className="h-3.5 w-3.5" /> Export view</Button><Button size="sm" onClick={() => onNavigate('safety')}><AlertTriangle className="h-3.5 w-3.5" /> Review alerts <span className="rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px]">4</span></Button></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Safety score" value="94.2%" change="+2.4%" trend="up" icon={ShieldCheck} tone="success" /><MetricCard label="Active workers" value="1,248" change="+38 today" trend="up" icon={Users} tone="info" /><MetricCard label="Equipment health" value="93.4%" change="+1.8%" trend="up" icon={Gauge} tone="primary" /><MetricCard label="Sensors online" value="98.7%" change="2 offline" trend="flat" icon={RadioTower} tone="warning" /></div><div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.75fr)]"><div className="ops-card p-5"><div className="mb-4 flex items-center justify-between"><PanelTitle icon={Map} eyebrow="Monitor" title="Live mine map" action={<Button variant="ghost" size="sm" onClick={() => onNavigate('mine')}>Open full map <ChevronRight className="h-4 w-4" /></Button>} /></div><MapSurface compact onAlert={() => onNavigate('mine')} /></div><div className="ops-card p-5"><PanelTitle icon={Bell} eyebrow="Respond" title="Active alerts" action={<Button variant="ghost" size="sm" onClick={() => onNavigate('safety')}>View all <ChevronRight className="h-4 w-4" /></Button>} /><div className="space-y-1">{alerts.map((alert) => <Button variant="ghost" key={alert.id} className="flex h-auto w-full items-start justify-start gap-3 rounded-lg px-2.5 py-3 text-left hover:bg-secondary" onClick={() => onAlert(alert)}><span className={cx('mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', alert.severity === 'critical' ? 'bg-safety-danger/10 text-safety-danger' : alert.severity === 'warning' ? 'bg-safety-warning/10 text-safety-warning' : 'bg-secondary text-secondary')}><AlertTriangle className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-foreground">{alert.title}</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{alert.location} · {alert.time}</span></span><ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" /></Button>)}</div></div></div><div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><div className="ops-card p-5"><PanelTitle icon={Activity} eyebrow="Analyze" title="Risk trend" action={<Badge tone="success"><ArrowDownRight className="h-3 w-3 rotate-45" /> 18% lower</Badge>} /><div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData}><defs><linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={.25} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={24} /><Tooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))', fontSize: 11 }} /><Area type="monotone" dataKey="risk" stroke="hsl(var(--primary))" fill="url(#riskFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></div><div className="ops-card p-5"><PanelTitle icon={Zap} eyebrow="Throughput" title="Shift productivity" /><div className="flex items-center gap-5"><div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: 'conic-gradient(hsl(var(--secondary)) 0 84%, hsl(var(--border)) 84% 100%)' }}><div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-surface"><span className="font-display text-2xl font-semibold">84%</span></div></div><div className="space-y-3 text-xs"><div><p className="text-muted-foreground">Material moved</p><p className="mt-1 font-semibold">18,420 <span className="font-normal text-muted-foreground">tonnes</span></p></div><div><p className="text-muted-foreground">vs target</p><p className="mt-1 font-semibold text-primary">+6.8%</p></div></div></div><div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground"><span className="text-primary">On track</span> · next shift handover in 01:18:42</div></div></div></div>;
}

function WorkerMobileView({
  onNavigate,
  user,
}: {
  onNavigate: (view: View) => void;
  user: AuthUser | null;
}) {
  const { toast } = useToast();
  return <div className="space-y-5"><div><p className="text-xs text-muted-foreground">Thursday, 12 June · Shift A</p><h1 className="mt-2 font-display text-2xl font-semibold">  Good evening, {user?.name ?? 'Worker'}</h1><p className="mt-2 text-sm text-muted-foreground">Stay aware. Stay connected.</p></div>   <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 p-5"><div className="flex items-start justify-between"><div><Badge tone="success"><StatusDot status="success" /> Safe to operate</Badge><p className="mt-4 text-xs text-muted-foreground">Personal safety score</p><p className="mt-1 font-display text-4xl font-semibold text-primary">98<span className="text-lg text-muted-foreground">/100</span></p></div><ShieldCheck className="h-9 w-9 text-primary" /></div><div className="mt-5 h-1.5 rounded-full bg-primary/15"><div className="h-full w-[98%] rounded-full bg-primary" /></div><p className="mt-2 text-[10px] text-muted-foreground">Excellent · +3 pts this week</p></div><div className="grid grid-cols-2 gap-4"><div className="ops-card p-4"><MapPin className="h-4 w-4 text-secondary" /><p className="mt-5 text-[10px] uppercase tracking-wider text-muted-foreground">Current zone</p><p className="mt-1 font-display text-lg font-semibold">Zone A</p><p className="mt-1 text-[10px] text-primary">Drill face 04</p></div><div className="ops-card p-4"><Clock3 className="h-4 w-4 text-safety-warning" /><p className="mt-5 text-[10px] uppercase tracking-wider text-muted-foreground">Shift remaining</p><p className="mt-1 font-display text-lg font-semibold">05:18:42</p><p className="mt-1 text-[10px] text-muted-foreground">Ends 14:00</p></div></div><div className="ops-card p-5"><PanelTitle icon={CheckCircle2} eyebrow="Today" title="Your tasks" action={<Badge tone="success">2 / 3 done</Badge>} /><div className="space-y-3">{['Complete pre-shift safety check', 'Inspect drill rig DR-03', 'Submit shift handover'].map((task, i) => <Button variant="ghost" className="flex h-auto w-full justify-start gap-3 rounded-lg border border-border/60 px-3 py-3 text-left" key={task} onClick={() => toast({ title: i === 0 ? 'Safety check complete' : 'Task opened', description: task })}><span className={cx('flex h-5 w-5 items-center justify-center rounded-full border', i < 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent')}>{i < 2 ? <Check className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-border" />}</span><span className={cx('text-xs', i < 2 && 'text-muted-foreground line-through')}>{task}</span></Button>)}</div></div><Button variant="danger" size="lg" className="h-14 w-full" onClick={() => toast({ title: 'SOS signal sent', description: 'Your location and profile have been shared with the response team.' })}><AlertTriangle className="h-5 w-5" /> Emergency SOS</Button><Button variant="outline" className="w-full" onClick={() => onNavigate('leave')}><CalendarDays className="h-4 w-4" /> Manage leave</Button></div>;
}

function SafetyView({ onSelect }: { onSelect: (alert: typeof alerts[number]) => void }) {
  const [tab, setTab] = useState('All'); const tabs = ['All', 'Critical', 'Warning', 'Information']; const filtered = tab === 'All' ? alerts : alerts.filter((alert) => alert.severity === tab.toLowerCase());
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs text-muted-foreground">Real-time incident response</p><h1 className="mt-2 font-display text-2xl font-semibold">Safety & alerts</h1><p className="mt-2 text-sm text-muted-foreground">Prioritize what needs attention across the mine.</p></div><div className="flex gap-2"><Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5" /> Filter</Button><Button size="sm"><MessageSquareWarning className="h-3.5 w-3.5" /> Create incident</Button></div></div><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Open alerts" value="04" change="1 critical" trend="down" icon={Bell} tone="warning" /><MetricCard label="Avg. response time" value="06:42" change="12% faster" trend="up" icon={Clock3} tone="success" /><MetricCard label="Safety score" value="94.2%" change="+2.4%" trend="up" icon={ShieldCheck} tone="success" /></div><div className="ops-card overflow-hidden"><div className="flex flex-wrap items-center gap-1 border-b border-border p-3">{tabs.map((item) => <Button key={item} variant={tab === item ? 'secondary' : 'ghost'} size="sm" onClick={() => setTab(item)} className={cx(tab === item && 'text-primary')}>{item}{item !== 'All' && <span className="ml-1 rounded-full bg-background px-1.5 text-[10px]">{alerts.filter((a) => a.severity === item.toLowerCase()).length}</span>}</Button>)}</div><div className="divide-y divide-border/70">{filtered.map((alert) => <Button variant="ghost" key={alert.id} className="flex h-auto w-full items-start justify-start gap-4 rounded-none px-5 py-5 text-left hover:bg-secondary/50" onClick={() => onSelect(alert)}><span className={cx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', alert.severity === 'critical' ? 'bg-safety-danger/10 text-safety-danger' : alert.severity === 'warning' ? 'bg-safety-warning/10 text-safety-warning' : 'bg-secondary text-secondary')}><AlertTriangle className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-foreground">{alert.title}</span><Badge tone={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}>{alert.severity}</Badge></span><span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {alert.location}</span><span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> {alert.time}</span><span>Reading: <b className="text-foreground">{alert.reading}</b></span></span></span><span className="hidden text-right sm:block"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Risk score</span><span className={cx('mt-1 block font-display text-lg font-semibold', alert.score > 80 ? 'text-safety-danger' : alert.score > 50 ? 'text-safety-warning' : 'text-primary')}>{alert.score}</span></span><ChevronRight className="mt-3 h-4 w-4 text-muted-foreground" /></Button>)}</div></div></div>;
}

function WorkersView({ onSelect }: { onSelect: (worker: typeof workers[number]) => void }) {
  const [search, setSearch] = useState(''); const filtered = workers.filter((worker) => `${worker.name} ${worker.id} ${worker.zone}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs text-muted-foreground">People & presence</p><h1 className="mt-2 font-display text-2xl font-semibold">Workforce</h1><p className="mt-2 text-sm text-muted-foreground">Know where your teams are and how they’re doing.</p></div><Button size="sm"><Users className="h-3.5 w-3.5" /> Add worker</Button></div><div className="grid gap-4 sm:grid-cols-4"><MetricCard label="Total workers" value="1,486" change="+42 this month" trend="up" icon={Users} tone="info" /><MetricCard label="On site" value="1,248" change="83.9%" trend="up" icon={MapPin} tone="success" /><MetricCard label="Absent" value="238" change="On schedule" trend="flat" icon={Clock3} tone="warning" /><MetricCard label="Contractors" value="164" change="12 active zones" trend="flat" icon={HardHat} tone="primary" /></div><div className="ops-card overflow-hidden"><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search workers or zones" /></div><div className="flex gap-2"><Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5" /> Status</Button><Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Export</Button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[.14em] text-muted-foreground"><tr>{['Worker', 'Role', 'Zone', 'Status', 'Last seen', 'Safety score', ''].map((head) => <th key={head} className="px-5 py-3 font-semibold">{head}</th>)}</tr></thead><tbody className="divide-y divide-border/70">{filtered.map((worker) => <tr key={worker.id} className="transition-colors hover:bg-secondary/30"><td className="px-5 py-4"><Button variant="ghost" className="h-auto justify-start gap-3 p-0 text-left" onClick={() => onSelect(worker)}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-display text-xs font-semibold text-primary">{worker.name.split(' ').map((n) => n[0]).join('')}</span><span><span className="block text-xs font-semibold text-foreground">{worker.name}</span><span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{worker.id}</span></span></Button></td><td className="px-5 py-4 text-xs text-muted-foreground">{worker.role}</td><td className="px-5 py-4 text-xs text-muted-foreground">{worker.zone}</td><td className="px-5 py-4"><Badge tone={worker.status === 'On site' ? 'success' : 'warning'}><StatusDot status={worker.status === 'On site' ? 'success' : 'warning'} /> {worker.status}</Badge></td><td className="px-5 py-4 text-xs text-muted-foreground">{worker.lastSeen}</td><td className="px-5 py-4"><span className={cx('font-display text-sm font-semibold', worker.score > 90 ? 'text-primary' : 'text-safety-warning')}>{worker.score}</span><span className="text-xs text-muted-foreground">/100</span></td><td className="px-5 py-4"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSelect(worker)} aria-label={`Open ${worker.name}`}><MoreHorizontal className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div></div></div>;
}

function EquipmentView({ onSelect }: { onSelect: (asset: typeof equipment[number]) => void }) {
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs text-muted-foreground">Assets & maintenance</p><h1 className="mt-2 font-display text-2xl font-semibold">Equipment</h1><p className="mt-2 text-sm text-muted-foreground">Predict maintenance before downtime impacts production.</p></div><Button size="sm"><Wrench className="h-3.5 w-3.5" /> Schedule service</Button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total equipment" value="92" change="Across 4 zones" trend="flat" icon={Truck} tone="primary" /><MetricCard label="Operational" value="86" change="93.4% uptime" trend="up" icon={CheckCircle2} tone="success" /><MetricCard label="Under maintenance" value="04" change="2 due today" trend="flat" icon={Wrench} tone="warning" /><MetricCard label="Out of service" value="02" change="1 critical" trend="down" icon={AlertCircle} tone="danger" /></div><div className="ops-card overflow-hidden"><div className="flex items-center justify-between border-b border-border p-4"><div className="flex items-center gap-2"><Table2 className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Asset health register</span></div><Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Export fleet</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[.14em] text-muted-foreground"><tr>{['Asset', 'Type', 'Zone', 'Status', 'Health', 'Last maintenance', ''].map((head) => <th key={head} className="px-5 py-3 font-semibold">{head}</th>)}</tr></thead><tbody className="divide-y divide-border/70">{equipment.map((asset) => <tr key={asset.id} className="transition-colors hover:bg-secondary/30"><td className="px-5 py-4"><Button variant="ghost" className="h-auto justify-start gap-3 p-0 text-left" onClick={() => onSelect(asset)}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary"><Truck className="h-4 w-4" /></span><span><span className="block text-xs font-semibold text-foreground">{asset.name}</span><span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{asset.id}</span></span></Button></td><td className="px-5 py-4 text-xs text-muted-foreground">{asset.type}</td><td className="px-5 py-4 text-xs text-muted-foreground">{asset.zone}</td><td className="px-5 py-4"><Badge tone={asset.status === 'Operational' ? 'success' : asset.status === 'Maintenance' ? 'warning' : 'danger'}><StatusDot status={asset.status === 'Operational' ? 'success' : asset.status === 'Maintenance' ? 'warning' : 'danger'} /> {asset.status}</Badge></td><td className="px-5 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-16 rounded-full bg-secondary"><div className={cx('h-full rounded-full', asset.health > 80 ? 'bg-primary' : asset.health > 50 ? 'bg-safety-warning' : 'bg-safety-danger')} style={{ width: `${asset.health}%` }} /></div><span className="text-xs font-semibold">{asset.health}%</span></div></td><td className="px-5 py-4 text-xs text-muted-foreground">{asset.maintenance}</td><td className="px-5 py-4"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSelect(asset)} aria-label={`Open ${asset.name}`}><MoreHorizontal className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div></div></div>;
}

function AnalyticsView() {
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs text-muted-foreground">Operational intelligence</p><h1 className="mt-2 font-display text-2xl font-semibold">Analytics</h1><p className="mt-2 text-sm text-muted-foreground">Find the patterns behind safer, more productive shifts.</p></div><div className="flex gap-2"><Button variant="outline" size="sm"><CalendarDays className="h-3.5 w-3.5" /> Last 7 days <ChevronDown className="h-3 w-3" /></Button><Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5" /> Pit 04</Button></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Incidents" value="09" change="-28% vs prior" trend="up" icon={AlertTriangle} tone="danger" /><MetricCard label="Avg. risk score" value="24.8" change="-18% vs prior" trend="up" icon={Activity} tone="warning" /><MetricCard label="Equipment downtime" value="2.6%" change="-0.8% vs prior" trend="up" icon={Wrench} tone="primary" /><MetricCard label="Productivity" value="84.2%" change="+6.8% vs prior" trend="up" icon={Target} tone="success" /></div><div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><div className="ops-card p-5"><PanelTitle icon={Activity} eyebrow="Safety signal" title="Risk score trend" /><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><RechartsLineChart data={trendData}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={24} /><Tooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))', fontSize: 11 }} /><Line type="monotone" dataKey="risk" name="Risk score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--primary))', r: 3 }} /><Line type="monotone" dataKey="incidents" name="Incidents" stroke="hsl(var(--danger))" strokeWidth={2} dot={{ fill: 'hsl(var(--danger))', r: 3 }} /></RechartsLineChart></ResponsiveContainer></div></div><div className="ops-card p-5"><PanelTitle icon={Zap} eyebrow="Output" title="Productivity by zone" /><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ zone: 'A', value: 88 }, { zone: 'B', value: 76 }, { zone: 'C', value: 91 }, { zone: 'D', value: 68 }]}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="zone" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={24} /><Tooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))', fontSize: 11 }} /><Bar dataKey="value" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div></div></div>;
}

function ReportsView() {
  const { toast } = useToast(); const reports = [['Daily operations brief', 'Daily operations', '12 Jun 2025', 'Ready'], ['Safety summary · Pit 04', 'Safety summary', '11 Jun 2025', 'Ready'], ['Incident response · INC-204', 'Incident report', '11 Jun 2025', 'Processing'], ['Fleet health digest', 'Equipment health', '10 Jun 2025', 'Ready'], ['Productivity by zone', 'Productivity', '09 Jun 2025', 'Ready']];
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs text-muted-foreground">Evidence & accountability</p><h1 className="mt-2 font-display text-2xl font-semibold">Reports</h1><p className="mt-2 text-sm text-muted-foreground">Generate a clear record of every operational decision.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => toast({ title: 'Schedule report', description: 'Report scheduling preferences opened.' })}><CalendarDays className="h-3.5 w-3.5" /> Schedule</Button><Button size="sm" onClick={() => toast({ title: 'Report builder opened', description: 'Choose a report type to get started.' })}><FileText className="h-3.5 w-3.5" /> Generate report</Button></div></div><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Generated this month" value="128" change="+18%" trend="up" icon={FileBarChart} tone="primary" /><MetricCard label="Scheduled reports" value="08" change="Next at 06:00" trend="flat" icon={CalendarDays} tone="info" /><MetricCard label="Compliance coverage" value="100%" change="All zones" trend="up" icon={ShieldCheck} tone="success" /></div><div className="ops-card overflow-hidden"><div className="flex items-center justify-between border-b border-border p-4"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Report library</span></div><div className="flex gap-2"><Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Export CSV</Button><Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5" /> Filter</Button></div></div><div className="divide-y divide-border/70">{reports.map(([name, type, date, status]) => <div key={name} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><FileText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-[11px] text-muted-foreground">{type} · {date} · Generated by NEONOVA</p></div><Badge tone={status === 'Ready' ? 'success' : 'warning'}><StatusDot status={status === 'Ready' ? 'success' : 'warning'} /> {status}</Badge><Button variant="outline" size="sm" disabled={status !== 'Ready'} onClick={() => toast({ title: 'Download started', description: `${name} is being prepared as a PDF.` })}><Download className="h-3.5 w-3.5" /> PDF</Button></div>)}</div></div></div>;
}

function AdminView() {
  const { toast } = useToast(); const sections = [['Users', '1,486 active identities', Users], ['Roles & permissions', '4 role policies configured', ShieldCheck], ['Mines & zones', '3 sites · 14 zones', Map], ['Sensors', '2,184 registered · 98.7% online', RadioTower], ['Integrations', '6 connected services', Layers3], ['Notifications', '12 routing rules active', Bell], ['Audit logs', '24 events in the last hour', FileText], ['System health', 'All services operational', Activity]] as const;
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs text-muted-foreground">Platform governance</p><h1 className="mt-2 font-display text-2xl font-semibold">Administration</h1><p className="mt-2 text-sm text-muted-foreground">Configure the operating system behind your mine.</p></div><Button size="sm" onClick={() => toast({ title: 'Invite user', description: 'The invite workflow is ready to connect to your identity provider.' })}><Users className="h-3.5 w-3.5" /> Invite user</Button></div><div className="ops-card p-5"><PanelTitle icon={Settings} eyebrow="System control" title="Manage your workspace" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{sections.map(([title, description, Icon]) => <Button variant="outline" className="flex h-auto min-h-[132px] flex-col items-start justify-between p-4 text-left hover:border-primary/50 hover:bg-secondary" key={title} onClick={() => toast({ title, description })}><span className="flex w-full items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="h-4 w-4" /></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></span><span><span className="block text-xs font-semibold">{title}</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{description}</span></span></Button>)}</div></div><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div className="ops-card p-5"><PanelTitle icon={Activity} eyebrow="Status" title="System health" /><div className="space-y-4">{[['Telemetry ingestion', 'Operational', 'success'], ['Alert routing', 'Operational', 'success'], ['Report generation', 'Operational', 'success'], ['Data warehouse sync', 'Degraded · 2 min delay', 'warning']].map(([name, status, tone]) => <div className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0" key={name}><span className="text-xs text-muted-foreground">{name}</span><span className={cx('flex items-center gap-2 text-[11px] font-semibold', tone === 'success' ? 'text-primary' : 'text-safety-warning')}><StatusDot status={tone as 'success' | 'warning'} /> {status}</span></div>)}</div></div><div className="ops-card p-5"><PanelTitle icon={FileText} eyebrow="Governance" title="Recent audit activity" /><div className="space-y-1">{['Role policy updated for Safety Officer', 'New sensor group added to Zone C', 'Report export completed by Priya Sharma', 'Maintenance threshold changed for TR-08'].map((item, i) => <div key={item} className="flex items-center gap-3 rounded-lg px-2 py-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary"><Activity className="h-3.5 w-3.5 text-primary" /></span><div className="flex-1"><p className="text-xs font-medium">{item}</p><p className="mt-1 text-[10px] text-muted-foreground">{i + 1} hour{ i ? 's' : '' } ago · system event</p></div></div>)}</div></div></div></div>;
}

function DetailDrawer({ alert, worker, asset, onClose, onNavigate }: { alert: typeof alerts[number] | null; worker: typeof workers[number] | null; asset: typeof equipment[number] | null; onClose: () => void; onNavigate: (view: View) => void }) {
  if (!alert && !worker && !asset) return null;
  return <div className="fixed inset-0 z-50 flex justify-end bg-background/50 backdrop-blur-sm" onClick={onClose}><aside className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">{alert ? 'Alert detail' : worker ? 'Worker profile' : 'Equipment detail'}</p><h2 className="mt-1 font-display text-lg font-semibold">{alert?.title ?? worker?.name ?? asset?.name}</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close details"><X className="h-4 w-4" /></Button></div>{alert && <div className="space-y-5 pt-5"><Badge tone={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}><StatusDot status={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'} /> {alert.severity} · {alert.time}</Badge><div className="grid grid-cols-2 gap-3">{[['Risk score', `${alert.score}/100`], ['Reading', alert.reading], ['Affected workers', `${alert.workers}`], ['Location', alert.location]].map(([label, value]) => <div className="rounded-lg border border-border bg-secondary/50 p-3" key={label}><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}</div><div className="rounded-lg border border-safety-warning/25 bg-safety-warning/10 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-safety-warning"><Zap className="h-3.5 w-3.5" /> Recommended action</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{alert.action}</p></div><div><p className="mb-3 text-xs font-semibold">Live sensor readings</p><div className="space-y-3">{[['Methane', '4.8%', 'critical'], ['Temperature', '42°C', 'success'], ['Airflow', '2.8 m/s', 'success'], ['Dust PM2.5', '18 µg/m³', 'warning']].map(([name, value, tone]) => <div className="flex items-center justify-between border-b border-border/60 pb-3 text-xs last:border-0" key={name}><span className="text-muted-foreground">{name}</span><span className={cx('flex items-center gap-2 font-semibold', tone === 'critical' ? 'text-safety-danger' : tone === 'warning' ? 'text-safety-warning' : 'text-primary')}><StatusDot status={tone as 'danger' | 'warning' | 'success'} /> {value}</span></div>)}</div></div><div className="grid grid-cols-2 gap-3"><Button onClick={onClose}><Check className="h-4 w-4" /> Acknowledge</Button><Button variant="danger" onClick={() => onNavigate('reports')}><ArrowUpRight className="h-4 w-4" /> Escalate</Button></div></div>}{worker && <div className="space-y-5 pt-5"><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary font-display text-lg font-semibold text-primary">{worker.name.split(' ').map((n) => n[0]).join('')}</span><div><p className="text-sm font-semibold">{worker.role}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{worker.id} · {worker.shift}</p><div className="mt-2"><Badge tone={worker.status === 'On site' ? 'success' : 'warning'}><StatusDot status={worker.status === 'On site' ? 'success' : 'warning'} /> {worker.status}</Badge></div></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-lg border border-border bg-secondary/50 p-3"><p className="text-[10px] text-muted-foreground">Current zone</p><p className="mt-2 text-sm font-semibold">{worker.zone}</p></div><div className="rounded-lg border border-border bg-secondary/50 p-3"><p className="text-[10px] text-muted-foreground">Safety score</p><p className="mt-2 font-display text-lg font-semibold text-primary">{worker.score}/100</p></div></div><div className="rounded-lg border border-border p-4"><p className="text-xs font-semibold">Activity history</p><div className="mt-4 space-y-4 border-l border-border pl-4 text-xs"><p><span className="font-semibold">Checked into {worker.zone}</span><span className="mt-1 block text-[10px] text-muted-foreground">{worker.lastSeen}</span></p><p><span className="font-semibold">Completed PPE verification</span><span className="mt-1 block text-[10px] text-muted-foreground">Today · 06:08</span></p><p><span className="font-semibold">Shift briefing acknowledged</span><span className="mt-1 block text-[10px] text-muted-foreground">Today · 05:52</span></p></div></div><Button className="w-full" onClick={() => onNavigate('safety')}><ShieldCheck className="h-4 w-4" /> View safety history</Button></div>}{asset && <div className="space-y-5 pt-5"><div className="grid grid-cols-2 gap-3">{[['Health score', `${asset.health}%`], ['Operating hours', '8,420 h'], ['Temperature', asset.temp], ['Vibration', asset.vibration], ['Fuel level', '68%'], ['Next service', 'In 42 h']].map(([label, value]) => <div className="rounded-lg border border-border bg-secondary/50 p-3" key={label}><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}</div><div className="rounded-lg border border-primary/25 bg-primary/10 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> Predictive maintenance</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Based on vibration and thermal telemetry, schedule a bearing inspection in the next 42 operating hours.</p></div><Button className="w-full" onClick={onClose}><Wrench className="h-4 w-4" /> Schedule maintenance</Button></div>}</aside></div>;
}
function Signup({
  onBack,
  onLogin,
}: {
  onBack: () => void;
  onLogin: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<
    'FIELD_WORKER' | 'MINE_MANAGER' | 'SAFETY_OFFICER' | null
  >(null);

  const [mines, setMines] = useState<
    {
      id: number;
      name: string;
      mine_code: string;
      location: string | null;
      status: 'ACTIVE' | 'INACTIVE';
    }[]
  >([]);

  const [loadingMines, setLoadingMines] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [registrationId, setRegistrationId] = useState<number | null>(
    null
  );

  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',

    mineId: '',
    employeeId: '',
    department: '',
    designation: '',

    certificationNumber: '',
    safetyTrainingId: '',
  });

  useEffect(() => {
    const loadMines = async () => {
      try {
        setLoadingMines(true);

        const data = await getMines();

        setMines(data);
      } catch (err) {
        console.error('Failed to load mines:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load mines.'
        );
      } finally {
        setLoadingMines(false);
      }
    };

    loadMines();
  }, []);

  const updateField = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const selectRole = (
    role:
      | 'FIELD_WORKER'
      | 'MINE_MANAGER'
      | 'SAFETY_OFFICER'
  ) => {
    setSelectedRole(role);
    setError('');
  };

  const submitRegistration = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');

    if (!selectedRole) {
      setError('Please select a role.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError(
        'Password must contain at least 8 characters.'
      );
      return;
    }

    if (!form.mineId) {
      setError('Please select your mine.');
      return;
    }

    if (
      selectedRole === 'FIELD_WORKER' &&
      !form.employeeId.trim()
    ) {
      setError('Employee ID is required for Field Workers.');
      return;
    }

    if (
      selectedRole === 'SAFETY_OFFICER' &&
      !form.certificationNumber.trim()
    ) {
      setError(
        'Safety certification number is required.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,

        requestedRole: selectedRole,

        mineId: Number(form.mineId),

        employeeId:
          form.employeeId.trim() || undefined,

        department:
          form.department.trim() || undefined,

        designation:
          form.designation.trim() || undefined,

        certificationNumber:
          form.certificationNumber.trim() || undefined,

        safetyTrainingId:
          form.safetyTrainingId.trim() || undefined,
      });

      setRegistrationId(
        result.registration?.id ?? null
      );

      setSubmitted(true);
    } catch (err) {
      console.error('Registration failed:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Registration failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
  ================================================
  SUCCESS SCREEN
  ================================================
  */

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#05090d] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 md:p-12 text-center shadow-2xl">

            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 border border-emerald-400/30">
              <svg
                className="h-8 w-8 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  d="M20 6 9 17l-5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="text-sm uppercase tracking-[0.25em] text-emerald-400 mb-3">
              Registration Submitted
            </p>

            <h1 className="text-3xl md:text-4xl font-semibold">
              Your MINEXA application is under review
            </h1>

            <p className="mt-4 text-slate-400 leading-7">
              Your registration has been successfully
              submitted. An authorized MINEXA reviewer
              will verify your application before your
              account is activated.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6 text-left">
              <div className="flex justify-between gap-4 py-2">
                <span className="text-slate-400">
                  Application ID
                </span>

                <span className="font-mono text-white">
                  {registrationId
                    ? `REG-${String(registrationId).padStart(
                        5,
                        '0'
                      )}`
                    : 'Processing'}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-2">
                <span className="text-slate-400">
                  Requested Role
                </span>

                <span className="text-white">
                  {selectedRole === 'FIELD_WORKER'
                    ? 'Field Worker'
                    : selectedRole === 'MINE_MANAGER'
                    ? 'Mine Manager'
                    : 'Safety Officer'}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-2">
                <span className="text-slate-400">
                  Status
                </span>

                <span className="text-amber-400 font-medium">
                  Pending Approval
                </span>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={onLogin}
                className="w-full rounded-xl bg-emerald-400 px-6 py-3.5 font-medium text-black hover:bg-emerald-300 transition"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
  ================================================
  ROLE SELECTION
  ================================================
  */

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-[#05090d] text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">

          <button
            type="button"
            onClick={onBack}
            className="text-slate-400 hover:text-white transition"
          >
            ← Back
          </button>

          <div className="mx-auto mt-12 max-w-3xl text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-400">
              Join MINEXA
            </p>

            <h1 className="mt-4 text-4xl md:text-5xl font-semibold">
              What are you joining as?
            </h1>

            <p className="mt-4 text-slate-400">
              Choose the role you are applying for.
              Your role will be assigned after approval.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">

            {/* FIELD WORKER */}
            <button
              type="button"
              onClick={() =>
                selectRole('FIELD_WORKER')
              }
              className="group rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-left transition hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-emerald-400/[0.04]"
            >
              <div className="text-4xl">🦺</div>

              <h2 className="mt-6 text-xl font-semibold">
                Field Worker
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Access personal safety, health,
                tasks, leave and field operations.
              </p>

              <div className="mt-7 text-sm font-medium text-emerald-400">
                Apply as Field Worker →
              </div>
            </button>

            {/* MINE MANAGER */}
            <button
              type="button"
              onClick={() =>
                selectRole('MINE_MANAGER')
              }
              className="group rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-left transition hover:-translate-y-1 hover:border-blue-400/40 hover:bg-blue-400/[0.04]"
            >
              <div className="text-4xl">🏭</div>

              <h2 className="mt-6 text-xl font-semibold">
                Mine Manager
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Manage mine operations, workers,
                equipment and operational approvals.
              </p>

              <div className="mt-7 text-sm font-medium text-blue-400">
                Apply as Mine Manager →
              </div>
            </button>

            {/* SAFETY OFFICER */}
            <button
              type="button"
              onClick={() =>
                selectRole('SAFETY_OFFICER')
              }
              className="group rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-left transition hover:-translate-y-1 hover:border-amber-400/40 hover:bg-amber-400/[0.04]"
            >
              <div className="text-4xl">🛡️</div>

              <h2 className="mt-6 text-xl font-semibold">
                Safety Officer
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Manage safety verification,
                compliance and worker safety reviews.
              </p>

              <div className="mt-7 text-sm font-medium text-amber-400">
                Apply as Safety Officer →
              </div>
            </button>

          </div>

          <p className="mt-10 text-center text-sm text-slate-500">
            Platform Admin accounts are created through
            controlled administration and cannot be
            requested through public signup.
          </p>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onLogin}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
  ================================================
  REGISTRATION FORM
  ================================================
  */

  return (
    <div className="min-h-screen bg-[#05090d] text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">

        <button
          type="button"
          onClick={() => {
            setSelectedRole(null);
            setError('');
          }}
          className="text-slate-400 hover:text-white transition"
        >
          ← Change role
        </button>

        <div className="mt-10">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-400">
            MINEXA Registration
          </p>

          <h1 className="mt-3 text-4xl font-semibold">
            Create your account
          </h1>

          <p className="mt-3 text-slate-400">
            Applying as{' '}
            <span className="text-white font-medium">
              {selectedRole === 'FIELD_WORKER'
                ? 'Field Worker'
                : selectedRole === 'MINE_MANAGER'
                ? 'Mine Manager'
                : 'Safety Officer'}
            </span>
          </p>
        </div>

        {error && (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={submitRegistration}
          className="mt-8 space-y-6"
        >

          {/* PERSONAL INFORMATION */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h2 className="text-lg font-semibold">
              Personal Information
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-300">
                  Full name
                </label>

                <input
                  value={form.name}
                  onChange={(e) =>
                    updateField(
                      'name',
                      e.target.value
                    )
                  }
                  required
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Work email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    updateField(
                      'email',
                      e.target.value
                    )
                  }
                  required
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Phone
                </label>

                <input
                  value={form.phone}
                  onChange={(e) =>
                    updateField(
                      'phone',
                      e.target.value
                    )
                  }
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Password
                </label>

                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    updateField(
                      'password',
                      e.target.value
                    )
                  }
                  required
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Confirm password
                </label>

                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateField(
                      'confirmPassword',
                      e.target.value
                    )
                  }
                  required
                  placeholder="Repeat your password"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
                />
              </div>

            </div>
          </section>

          {/* ORGANIZATION */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h2 className="text-lg font-semibold">
              Organization
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Mine
                </label>

                <select
                  value={form.mineId}
                  onChange={(e) =>
                    updateField(
                      'mineId',
                      e.target.value
                    )
                  }
                  required
                  disabled={loadingMines}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-emerald-400/60"
                >
                  <option value="">
                    {loadingMines
                      ? 'Loading mines...'
                      : 'Select mine'}
                  </option>

                  {mines.map((mine) => (
                    <option
                      key={mine.id}
                      value={mine.id}
                    >
                      {mine.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRole === 'FIELD_WORKER' && (
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Employee ID
                  </label>

                  <input
                    value={form.employeeId}
                    onChange={(e) =>
                      updateField(
                        'employeeId',
                        e.target.value
                      )
                    }
                    required
                    placeholder="e.g. MW-1055"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Department
                </label>

                <input
                  value={form.department}
                  onChange={(e) =>
                    updateField(
                      'department',
                      e.target.value
                    )
                  }
                  placeholder="Operations"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Designation
                </label>

                <input
                  value={form.designation}
                  onChange={(e) =>
                    updateField(
                      'designation',
                      e.target.value
                    )
                  }
                  placeholder="Your designation"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
                />
              </div>

            </div>
          </section>

          {/* SAFETY INFORMATION */}
          {(selectedRole === 'FIELD_WORKER' ||
            selectedRole === 'SAFETY_OFFICER') && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <h2 className="text-lg font-semibold">
                Safety Information
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Safety Training ID
                  </label>

                  <input
                    value={form.safetyTrainingId}
                    onChange={(e) =>
                      updateField(
                        'safetyTrainingId',
                        e.target.value
                      )
                    }
                    placeholder="e.g. ST-1055"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Certification Number
                  </label>

                  <input
                    value={form.certificationNumber}
                    onChange={(e) =>
                      updateField(
                        'certificationNumber',
                        e.target.value
                      )
                    }
                    required={
                      selectedRole ===
                      'SAFETY_OFFICER'
                    }
                    placeholder="Certification ID"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
                  />
                </div>

              </div>
            </section>
          )}

          {/* SUBMIT */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">

            <div className="flex items-start gap-3 text-sm text-slate-400">
              <span className="mt-0.5 text-emerald-400">
                ✓
              </span>

              <p>
                By submitting this application, you
                understand that your requested role is
                subject to MINEXA approval and
                verification.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-emerald-400 px-6 py-3.5 font-medium text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'Submitting application...'
                : 'Submit registration'}
            </button>

          </div>
        </form>

      </div>
    </div>
  );
}
function AppShell({
  role,
  user,
  onLogout,
}: {
  role: Role;
  user: AuthUser | null;
  onLogout: () => void;
}) {
  const [activeView, setActiveView] = useState<View>(roleMeta[role].defaultView); const [sidebarOpen, setSidebarOpen] = useState(false); const [notifications, setNotifications] = useState(false); const [selectedAlert, setSelectedAlert] = useState<typeof alerts[number] | null>(null); const [selectedWorker, setSelectedWorker] = useState<typeof workers[number] | null>(null); const [selectedAsset, setSelectedAsset] = useState<typeof equipment[number] | null>(null); const [search, setSearch] = useState(''); const { toast } = useToast(); const meta = roleMeta[role]; const RoleIcon = meta.icon;
  const filteredNav = useMemo(() => navItems.filter((item) => roleAccess[role].includes(item.id)), [role]);
  const selectView = (view: View) => { if (!roleAccess[role].includes(view)) { toast({ title: 'Access restricted', description: `This workspace is not available to the ${meta.label.toLowerCase()} role.`, variant: 'destructive' }); return; } setActiveView(view); setSidebarOpen(false); };
  const pageTitle = navItems.find((item) => item.id === activeView)?.label ?? 'Command center';
  return <div className="min-h-screen bg-background text-foreground"><div className={cx('fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity lg:hidden', sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setSidebarOpen(false)} /><aside className={cx('fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-border bg-surface transition-transform lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}><div className="flex h-[76px] items-center border-b border-border px-5"><LogoMark /></div><div className="flex-1 overflow-y-auto px-3 py-5"><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Navigation</p><nav className="space-y-1">{filteredNav.map((item, index) => { const Icon = item.icon; return <React.Fragment key={item.id}>{item.section && index !== 0 && <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">{item.section}</p>}<Button variant={activeView === item.id ? 'secondary' : 'ghost'} onClick={() => selectView(item.id)} className={cx('w-full justify-start gap-3 px-3 text-xs', activeView === item.id && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}><Icon className="h-4 w-4" />{item.label}{item.id === 'safety' && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-safety-danger/15 px-1.5 text-[10px] font-bold text-safety-danger">4</span>}</Button></React.Fragment>})}</nav></div><div className="border-t border-border p-3"><Button variant="ghost" className="w-full justify-start gap-3 px-3 text-xs" onClick={() => selectView('settings')}><Settings className="h-4 w-4" /> Workspace settings</Button><div className="mt-2 flex items-center gap-3 rounded-lg bg-secondary/60 p-3"><span className={cx('flex h-8 w-8 items-center justify-center rounded-full bg-background', meta.color)}><RoleIcon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user?.name ?? 'Worker'}</p><p className="truncate text-[10px] text-muted-foreground">{meta.label}</p></div><Button variant="ghost" size="icon" className="h-7 w-7" onClick={onLogout} aria-label="Log out"><LogOut className="h-3.5 w-3.5" /></Button></div></div></aside><div className="lg:pl-[268px]"><header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></Button><div className="hidden sm:block"><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Workspace / <span className="text-foreground">{pageTitle}</span></p><div className="mt-1 flex items-center gap-2 text-xs font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Pit 04 · Jharkhand Operations</div></div><div className="sm:hidden"><LogoMark /></div></div><div className="flex items-center gap-2"><div className="relative hidden w-56 md:block"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workspace" className="h-9 pl-9 text-xs" /></div><Button variant="ghost" size="icon" className="relative" onClick={() => setNotifications(!notifications)} aria-label="Notifications"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-safety-danger" /></Button><Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">HK</span><ChevronDown className="h-3 w-3" /></Button></div></header><main className="mx-auto max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8">{activeView === 'dashboard' && <DashboardView role={role}   user={user}
  onNavigate={selectView}
  onAlert={setSelectedAlert}/>}{activeView === 'mine' && <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs text-muted-foreground">Spatial operations</p><h1 className="mt-2 font-display text-2xl font-semibold">Live mine map</h1><p className="mt-2 text-sm text-muted-foreground">Monitor zones, people, equipment, and risk in one view.</p></div><div className="flex gap-2"><Button variant="outline" size="sm"><RadioTower className="h-3.5 w-3.5" /> Sensor filter</Button><Button variant="outline" size="sm"><Users className="h-3.5 w-3.5" /> Worker filter</Button><Button variant="outline" size="sm"><AlertTriangle className="h-3.5 w-3.5" /> Risk level</Button></div></div><MapSurface onAlert={() => toast({ title: 'Map filters opened', description: 'Filter by sensors, workers, equipment, or risk level.' })} /></div>}{activeView === 'safety' && <SafetyView onSelect={setSelectedAlert} />}{activeView === 'workers' && <WorkersView onSelect={setSelectedWorker} />}{activeView === 'worker-approvals' && ( <ManagerApprovalCenter />)}{activeView === 'safety-verification' && (<SafetyVerificationCenter />)}{activeView === 'health' && <WorkerHealth />}{activeView === 'leave' && (  
  <div className="space-y-6">
    <div>
      <p className="text-xs text-muted-foreground">
        My work
      </p>

      <h1 className="mt-2 font-display text-2xl font-semibold">
        Leave management
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Apply for leave and track your leave requests.
      </p>
    </div>

    <LeaveManagementForm />
  </div>
)}{activeView === 'equipment' && <EquipmentView onSelect={setSelectedAsset} />}{activeView === 'analytics' && <AnalyticsView />}{activeView === 'reports' && <ReportsView />}{activeView === 'admin' && (
  <AdminApprovalCenter />
)}{activeView === 'settings' && <div className="ops-card max-w-2xl p-6"><PanelTitle icon={Settings} eyebrow="Workspace" title="Settings" /><div className="space-y-4"><div className="flex items-center justify-between rounded-lg border border-border p-4"><div><p className="text-sm font-semibold">Live alert sounds</p><p className="mt-1 text-xs text-muted-foreground">Play a sound when a critical alert is received.</p></div><input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" /></div><div className="flex items-center justify-between rounded-lg border border-border p-4"><div><p className="text-sm font-semibold">Compact data density</p><p className="mt-1 text-xs text-muted-foreground">Show more operational rows in tables.</p></div><input type="checkbox" className="h-4 w-4 accent-primary" /></div><Button onClick={() => toast({ title: 'Settings saved', description: 'Workspace preferences updated.' })}>Save preferences</Button></div></div>}</main></div>{notifications && <div className="fixed right-4 top-[84px] z-40 w-[min(360px,calc(100vw-32px))] rounded-xl border border-border bg-surface p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Notifications</p><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNotifications(false)} aria-label="Close notifications"><X className="h-3.5 w-3.5" /></Button></div><div className="space-y-2">{alerts.slice(0, 3).map((alert) => <Button key={alert.id} variant="ghost" className="flex h-auto w-full justify-start gap-3 rounded-lg p-2 text-left" onClick={() => { setSelectedAlert(alert); setNotifications(false); }}><StatusDot status={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'} /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{alert.title}</span><span className="mt-1 block text-[10px] text-muted-foreground">{alert.time}</span></span></Button>)}</div></div>}<DetailDrawer alert={selectedAlert} worker={selectedWorker} asset={selectedAsset} onClose={() => { setSelectedAlert(null); setSelectedWorker(null); setSelectedAsset(null); }} onNavigate={(view) => { setSelectedAlert(null); selectView(view); }} /></div>;
}

export default function NeonovaPlatform() {
  const [screen, setScreen] =
    useState<
      'landing' | 'login' | 'signup' | 'app' 
    >('landing');

  const [role, setRole] =
    useState<Role>('manager');

  const [currentUser, setCurrentUser] =
    useState<AuthUser | null>(null);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const { toast } = useToast();

  useEffect(() => {
    const restoreSession = async () => {
      const token =
        localStorage.getItem('minexa_token');

      // No existing session
      if (!token) {
        setCheckingSession(false);
        return;
      }

      try {
        const user =
          await getCurrentUser();

        const appRole =
          mapBackendRoleToAppRole(
            user.role,
          );

        setCurrentUser({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workerId: user.workerId,
        });

        setRole(appRole);
        setScreen('app');
      } catch (error) {
        console.error(
          'Session restoration failed:',
          error,
        );

        localStorage.removeItem(
          'minexa_token',
        );

        localStorage.removeItem(
          'minexa_user',
        );

        setCurrentUser(null);
        setScreen('login');
      } finally {
        setCheckingSession(false);
      }
    };

    restoreSession();
  }, []);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <p className="text-sm font-semibold">
            Restoring secure session...
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Verifying your MINEXA account.
          </p>
        </div>
      </div>
    );
  }

  if (screen === 'landing') {
    return (
      <Landing
        onExplore={() =>
          setScreen('login')
        }
        onDemo={() =>
          toast({
            title: 'Demo mode',
            description:
              'Explore the platform with the Mine Manager workspace.',
          })
        }
      />
    );
  }

  if (screen === 'login') {
    return (
      <Login
        onLogin={(
          authenticatedRole,
          authenticatedUser,
        ) => {
          setCurrentUser(
            authenticatedUser,
          );
          setRole(
            authenticatedRole,
          );
          setScreen('app');
        }}
        onSignup={() => setScreen('signup')}
      />
    );
  }

  if (screen === 'signup') {
    return (
      <Signup
        onBack={() => setScreen('login')}
        onLogin={() => setScreen('login')}
      />
    );
  }

  return (
    <AppShell
      role={role}
      user={currentUser}
      onLogout={() => {
        localStorage.removeItem(
          'minexa_token',
        );

        localStorage.removeItem(
          'minexa_user',
        );

        setCurrentUser(null);
        setRole('manager');
        setScreen('landing');
      }}
    />
  );
}