import { useQuery } from '@tanstack/react-query';
import { healthApi, shopifySettingsApi } from '../services/api';
import { useThemeStore } from '../stores/useThemeStore';
import { Link } from 'react-router-dom';

type Theme = 'light' | 'dark' | 'system';

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'light', label: '☀️ Light' },
  { value: 'dark', label: '🌙 Dark' },
  { value: 'system', label: '💻 System' },
];

function ConfigRow({ label, configured, link }: { label: string; configured: boolean; link?: string }) {
  const content = (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          configured
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${configured ? 'bg-green-500' : 'bg-gray-400'}`} />
        {configured ? 'Configured' : 'Not configured'}
      </span>
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="block hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        {content}
      </Link>
    );
  }

  return content;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.get,
    staleTime: 60_000,
  });


  type ShopifySettingsData = {
    enabled: boolean;
    configured: boolean;
    webhookRegistered: boolean;
    lastSyncAt?: string;
    apiVersion: string;
    maskedCredentials: Record<string, string>;
  };

  const { data: shopifySettings } = useQuery({
    queryKey: ['shopify-settings'],
    queryFn: () => shopifySettingsApi.get().then(r => r.data as ShopifySettingsData),
    staleTime: 60_000,
  });


  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Read-only view of your application configuration.
        </p>
      </div>

      <div className="space-y-5">
        {/* General */}
        <SectionCard title="General Settings">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">App Name</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Shipsmart</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Environment</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {'development'}
              </span>
            </div>
            {health && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Backend Version</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{health.version}</span>
              </div>
            )}
          </div>
        </SectionCard>

        {/* API Configuration */}
        <SectionCard title="API Configuration">
          {health ? (
            <div>
              <ConfigRow label="Firebase / Firestore" configured={health.services.firebase.status === 'healthy'} />
              <ConfigRow
                label="Shopify Integration"
                configured={shopifySettings?.configured ?? false}
                link="/settings/shopify"
              />
              {Object.entries(health.services.carriers).map(([carrier, info]) => (
                <ConfigRow
                  key={carrier}
                  label={`${carrier.charAt(0).toUpperCase() + carrier.slice(1)} Carrier`}
                  configured={info.status === 'healthy'}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading configuration status…</p>
          )}
        </SectionCard>

        {/* Theme */}
        <SectionCard title="Theme">
          <div className="flex gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  theme === opt.value
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
