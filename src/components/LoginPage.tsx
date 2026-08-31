import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Eye, HardHat } from 'lucide-react';
import neonovaLogo from '@/assets/neonova-logo.png';
import heroBg from '@/assets/hero-bg.jpg';

interface LoginPageProps {
  onLogin: (role: 'worker' | 'supervisor' | 'dgms') => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${heroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* Floating elements */}
      <div className="absolute top-20 left-20 w-20 h-20 bg-neonova-blue/20 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-32 right-32 w-32 h-32 bg-safety-success/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-10 w-16 h-16 bg-safety-warning/20 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }} />
      
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <div className="text-center mb-12 neonova-animate-fade-in">
          <div className="flex justify-center mb-6">
            <img 
              src={neonovaLogo} 
              alt="NEONOVA Logo" 
              className="w-24 h-24 neonova-animate-pulse-slow"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gradient mb-4">
            NEONOVA
          </h1>
          <p className="text-xl text-foreground-muted max-w-2xl mx-auto leading-relaxed">
            Smart Mine Safety & Productivity Management Platform
          </p>
          <p className="text-foreground-muted mt-2 max-w-xl mx-auto">
            Digital transformation for coal mine operations with real-time safety monitoring, 
            compliance tracking, and intelligent reporting.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Worker Login */}
          <Card className="neonova-animate-slide-up hover:neonova-glow transition-all duration-500 group">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-safety-success/20 rounded-full w-fit group-hover:bg-safety-success/30 transition-colors">
                <HardHat className="w-8 h-8 text-safety-success" />
              </div>
              <CardTitle className="text-xl font-bold">Mine Worker</CardTitle>
              <CardDescription className="text-foreground-muted">
                Report hazards, complete tasks, and access safety protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-foreground-muted mb-6">
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-safety-success" />
                  Submit hazard reports
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-safety-success" />
                  Track daily tasks
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-safety-success" />
                  Access safety guidelines
                </li>
              </ul>
              <Button 
                variant="worker" 
                size="lg" 
                className="w-full"
                onClick={() => onLogin('worker')}
              >
                Login as Worker
              </Button>
            </CardContent>
          </Card>

          {/* Supervisor Login */}
          <Card className="neonova-animate-slide-up hover:neonova-glow transition-all duration-500 group" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-safety-warning/20 rounded-full w-fit group-hover:bg-safety-warning/30 transition-colors">
                <Users className="w-8 h-8 text-safety-warning" />
              </div>
              <CardTitle className="text-xl font-bold">Supervisor</CardTitle>
              <CardDescription className="text-foreground-muted">
                Validate reports, monitor teams, and manage shift operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-foreground-muted mb-6">
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-safety-warning" />
                  Validate worker reports
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-safety-warning" />
                  Monitor team activities
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-safety-warning" />
                  Generate shift logs
                </li>
              </ul>
              <Button 
                variant="supervisor" 
                size="lg" 
                className="w-full"
                onClick={() => onLogin('supervisor')}
              >
                Login as Supervisor
              </Button>
            </CardContent>
          </Card>

          {/* DGMS Login */}
          <Card className="neonova-animate-slide-up hover:neonova-glow transition-all duration-500 group" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-safety-info/20 rounded-full w-fit group-hover:bg-safety-info/30 transition-colors">
                <Eye className="w-8 h-8 text-safety-info" />
              </div>
              <CardTitle className="text-xl font-bold">DGMS Official</CardTitle>
              <CardDescription className="text-foreground-muted">
                Monitor compliance, view analytics, and access comprehensive reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-foreground-muted mb-6">
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-safety-info" />
                  View analytics dashboard
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-safety-info" />
                  Monitor compliance
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-safety-info" />
                  Generate reports
                </li>
              </ul>
              <Button 
                variant="dgms" 
                size="lg" 
                className="w-full"
                onClick={() => onLogin('dgms')}
              >
                Login as DGMS
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 neonova-animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <p className="text-sm text-foreground-muted">
            Secure • Compliant • Real-time • Intelligent
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;