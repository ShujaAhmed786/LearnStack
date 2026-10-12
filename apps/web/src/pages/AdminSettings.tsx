import React, { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import { Organization } from '@learnstack/shared';
import {
  Settings,
  Palette,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Teal (Default)', hex: '#14B8A6' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Cyan', hex: '#06B6D4' },
];

export const AdminSettings: React.FC = () => {
  const { org, refreshSession } = useAuth();

  const [name, setName] = useState(org?.name || 'LearnStack');
  const [logoUrl, setLogoUrl] = useState(org?.logoUrl || '');
  const [primaryColor, setPrimaryColor] = useState(org?.primaryColor || '#14B8A6');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await api.patch<Organization>('/v1/admin/org/settings', {
        name,
        logoUrl: logoUrl || null,
        primaryColor,
      });

      setSuccessMsg('Organization settings saved successfully!');
      // Refresh session auth state to update org branding live
      if (refreshSession) {
        await refreshSession();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Settings size={22} className="text-primary" />
            <h1 className="text-24 font-bold text-text">Organization Settings</h1>
          </div>
          <p className="text-14 text-text-muted mt-1">
            Customize organization branding, platform name, and primary accent colors with live preview.
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2 text-14">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error flex items-center gap-2 text-14">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Settings Form */}
          <Card className="p-6 bg-surface border-border space-y-6">
            <form onSubmit={handleSave} className="space-y-5">
              <Input
                label="Organization Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Academy"
                required
              />

              <Input
                label="Logo Image URL (Optional)"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />

              {/* Color Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-13 font-medium text-text flex items-center gap-1.5">
                    <Palette size={16} /> Primary Accent Color
                  </label>
                  <span className="font-mono text-12 text-text-muted">{primaryColor}</span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer border border-border bg-transparent p-0.5"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#14B8A6"
                    className="font-mono"
                  />
                </div>

                {/* Preset Swatches */}
                <div className="pt-2">
                  <span className="text-11 text-text-muted block mb-2 font-medium uppercase tracking-wider">
                    Preset Palettes
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setPrimaryColor(preset.hex)}
                        className={`w-7 h-7 rounded-full transition-transform border-2 ${
                          primaryColor.toLowerCase() === preset.hex.toLowerCase()
                            ? 'scale-110 border-white'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Button type="submit" loading={saving} className="w-full">
                  Save Organization Settings
                </Button>
              </div>
            </form>
          </Card>

          {/* Live Preview Card */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-13 font-semibold text-text uppercase tracking-wider">
              <Sparkles size={16} className="text-primary" />
              <span>Live Branding Preview</span>
            </div>

            <Card className="p-6 bg-surface border-border space-y-6 shadow-xl">
              {/* Preview Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={name}
                    className="w-10 h-10 rounded-xl object-contain border border-border"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Layers size={22} />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-16 text-text">{name || 'Your Organization'}</h3>
                  <p className="text-12 text-text-muted">@{org?.slug || 'preview'}</p>
                </div>
              </div>

              {/* Sample UI Elements with Primary Color */}
              <div className="space-y-4">
                <span className="text-12 text-text-muted block font-medium">Sample Buttons</span>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg font-medium text-14 text-white shadow-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary Button
                  </button>

                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg font-medium text-14 bg-surface-hover border transition-colors"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    Outlined Button
                  </button>
                </div>

                <span className="text-12 text-text-muted block font-medium pt-2">
                  Sample Progress Bar
                </span>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-12 font-medium">
                    <span className="text-text-muted">Course Completion</span>
                    <span style={{ color: primaryColor }}>75%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: '75%', backgroundColor: primaryColor }}
                    />
                  </div>
                </div>

                <span className="text-12 text-text-muted block font-medium pt-2">
                  Sample Badges
                </span>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-11 font-medium"
                    style={{
                      backgroundColor: `${primaryColor}20`,
                      color: primaryColor,
                      border: `1px solid ${primaryColor}40`,
                    }}
                  >
                    Interactive Course
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-11 font-medium"
                    style={{
                      backgroundColor: `${primaryColor}20`,
                      color: primaryColor,
                      border: `1px solid ${primaryColor}40`,
                    }}
                  >
                    Verified Certificate
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
