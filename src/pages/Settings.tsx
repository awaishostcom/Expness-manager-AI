import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { User, Shield, Moon, Sun, Laptop, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { cn } from '../../lib/utils';

import { CURRENCIES } from '../lib/currency';
import { CurrencyCode } from '../types';

export const Settings: React.FC = () => {
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile?.name || '');
  const [currency, setCurrency] = useState<CurrencyCode>(profile?.currency || 'USD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setCurrency(profile.currency);
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await updateProfile(user, { displayName: name });
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        currency,
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <User className="h-5 w-5" />
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </div>
              <CardDescription>Update your personal details and how others see you</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={profile?.email} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Base Currency</Label>
                    <select 
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {c.name} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Moon className="h-5 w-5" />
                <CardTitle className="text-lg">Appearance</CardTitle>
              </div>
              <CardDescription>Customize how FinTrack looks on your device</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    theme === 'light' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                >
                  <Sun className="h-6 w-6 text-amber-500" />
                  <span className="text-xs font-medium">Light</span>
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    theme === 'dark' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                >
                  <Moon className="h-6 w-6 text-blue-500" />
                  <span className="text-xs font-medium">Dark</span>
                </button>
                <button 
                  onClick={() => setTheme('system')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    theme === 'system' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                >
                  <Laptop className="h-6 w-6 text-slate-500" />
                  <span className="text-xs font-medium">System</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" />
                <CardTitle className="text-lg">Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-medium text-foreground">Password</p>
                <p className="text-[10px] text-muted-foreground mb-2">Last changed 3 months ago</p>
                <Button variant="outline" size="sm" className="w-full h-8 text-xs">Change Password</Button>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-medium text-foreground">Two-Factor Auth</p>
                <p className="text-[10px] text-muted-foreground mb-2">Not enabled</p>
                <Button variant="outline" size="sm" className="w-full h-8 text-xs">Enable 2FA</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
