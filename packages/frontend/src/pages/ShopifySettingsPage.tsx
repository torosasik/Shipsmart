import { useState, useEffect, useCallback } from 'react';
import { shopifySettingsApi } from '../services/api';

/** Shopify settings info from the backend */
interface ShopifySettingsInfo {
  enabled: boolean;
  configured: boolean;
  webhookRegistered?: boolean;
  lastSyncAt?: string;
  apiVersion: string;
  maskedCredentials: {
    storeDomain: string;
    accessToken: string;
    webhookSecret: string;
    apiVersion: string;
  };
}

/** State for the credential form */
interface ShopifyFormState {
  storeDomain: string;
  accessToken: string;
  webhookSecret: string;
  apiVersion: string;
  enabled: boolean;
}

export function ShopifySettingsPage() {
  const [settings, setSettings] = useState<ShopifySettingsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<ShopifyFormState>({
    storeDomain: '',
    accessToken: '',
    webhookSecret: '',
    apiVersion: '2024-01',
    enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await shopifySettingsApi.get() as { data: ShopifySettingsInfo };
      setSettings(response.data);

      // Initialize form with current values
      setFormState({
        storeDomain: response.data.maskedCredentials.storeDomain || '',
        accessToken: '', // Don't populate for security
        webhookSecret: '', // Don't populate for security
        apiVersion: response.data.maskedCredentials.apiVersion || '2024-01',
        enabled: response.data.enabled,
      });

      setError(null);
    } catch (err) {
      setError('Failed to load Shopify settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);

      await shopifySettingsApi.update({
        storeDomain: formState.storeDomain,
        accessToken: formState.accessToken,
        webhookSecret: formState.webhookSecret,
        apiVersion: formState.apiVersion,
        enabled: formState.enabled,
      });

      setSaveMessage({ type: 'success', text: 'Shopify settings saved successfully' });
      await loadSettings(); // Reload to show masked credentials
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const response = await shopifySettingsApi.test() as { data: { success: boolean; message: string } };
      setSaveMessage({
        type: response.data.success ? 'success' : 'error',
        text: response.data.message,
      });
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to test connection',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const response = await shopifySettingsApi.sync() as { data: any };
      setSyncMessage({
        type: 'success',
        text: `Successfully synced ${response.data?.synced || 0} orders`,
      });
      await loadSettings(); // Reload to update last sync timestamp
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to sync orders',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadSettings}
            className="mt-2 btn-secondary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shopify Integration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Connect your Shopify store to automatically sync orders and fulfillments.
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            settings?.configured
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              settings?.configured ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            {settings?.configured ? 'Connected' : 'Not Configured'}
          </span>
          {settings?.lastSyncAt && (
            <span className="text-xs text-gray-500">
              Last sync: {new Date(settings.lastSyncAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Shopify Credentials</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Store Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Store Domain
            </label>
            <input
              type="text"
              value={formState.storeDomain}
              onChange={(e) => setFormState(prev => ({ ...prev, storeDomain: e.target.value }))}
              placeholder="my-store.myshopify.com"
              className="input-field w-full"
            />
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin API Access Token
            </label>
            <input
              type="password"
              value={formState.accessToken}
              onChange={(e) => setFormState(prev => ({ ...prev, accessToken: e.target.value }))}
              placeholder="Enter your Shopify Admin API access token"
              className="input-field w-full"
            />
            {settings?.maskedCredentials.accessToken && (
              <p className="text-xs text-gray-500 mt-1">
                Current: {settings.maskedCredentials.accessToken}
              </p>
            )}
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Webhook Shared Secret
            </label>
            <input
              type="password"
              value={formState.webhookSecret}
              onChange={(e) => setFormState(prev => ({ ...prev, webhookSecret: e.target.value }))}
              placeholder="Enter your Shopify webhook shared secret"
              className="input-field w-full"
            />
            {settings?.maskedCredentials.webhookSecret && (
              <p className="text-xs text-gray-500 mt-1">
                Current: {settings.maskedCredentials.webhookSecret}
              </p>
            )}
          </div>

          {/* API Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Version
            </label>
            <input
              type="text"
              value={formState.apiVersion}
              onChange={(e) => setFormState(prev => ({ ...prev, apiVersion: e.target.value }))}
              placeholder="2024-01"
              className="input-field w-full max-w-xs"
            />
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="shopify-enabled"
              checked={formState.enabled}
              onChange={(e) => setFormState(prev => ({ ...prev, enabled: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="shopify-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Shopify Integration
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="btn-secondary disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {/* Messages */}
          {saveMessage && (
            <div className={`mt-4 p-3 rounded-md ${
              saveMessage.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {saveMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Sync Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Order Synchronization</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manually sync orders from Shopify. Webhooks will automatically sync new orders in real-time.
          </p>
          <button
            onClick={handleSync}
            disabled={syncing || !settings?.configured}
            className="btn-primary disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Orders Now'}
          </button>

          {syncMessage && (
            <div className={`mt-4 p-3 rounded-md ${
              syncMessage.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {syncMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mt-6 p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Setup Instructions</h3>
        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
          <li>Create a Custom App in your Shopify admin under <strong>Settings → Apps and sales channels → Develop apps</strong></li>
          <li>Configure Admin API scopes: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">read_orders</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">write_orders</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">read_fulfillments</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">write_fulfillments</code></li>
          <li>Install the app and copy the Admin API access token</li>
          <li>Copy the webhook shared secret from the app configuration</li>
          <li>Register webhooks in Shopify for: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">orders/create</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">orders/updated</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">fulfillments/create</code></li>
          <li>Use webhook URL: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded break-all">{window.location.origin}/api/webhooks/shopify</code></li>
        </ol>
      </div>
    </div>
  );
}