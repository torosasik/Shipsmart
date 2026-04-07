import { useState, useEffect, useCallback } from 'react';
import { carrierSettingsApi } from '../services/api';

/** Credential field definition from the backend */
interface CredentialField {
  key: string;
  label: string;
  secret: boolean;
  required: boolean;
  placeholder: string;
}

/** Carrier settings info from the backend */
interface CarrierInfo {
  carrierId: string;
  name: string;
  description: string;
  enabled: boolean;
  sandbox: boolean;
  configured: boolean;
  fields: CredentialField[];
  maskedCredentials?: Record<string, string>;
}

/** State for the credential form */
interface CarrierFormState {
  enabled: boolean;
  sandbox: boolean;
  credentials: Record<string, string>;
}

export function CarrierSettingsPage() {
  const [carriers, setCarriers] = useState<CarrierInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null);
  const [formState, setFormState] = useState<CarrierFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const loadCarriers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await carrierSettingsApi.list() as { data: CarrierInfo[] };
      setCarriers(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load carrier settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCarriers();
  }, [loadCarriers]);

  const handleExpand = async (carrierId: string) => {
    if (expandedCarrier === carrierId) {
      setExpandedCarrier(null);
      setFormState(null);
      setSaveMessage(null);
      return;
    }

    try {
      const response = await carrierSettingsApi.get(carrierId) as { data: CarrierInfo & { maskedCredentials: Record<string, string> } };
      const data = response.data;

      setExpandedCarrier(carrierId);
      setFormState({
        enabled: data.enabled,
        sandbox: data.sandbox,
        credentials: Object.fromEntries(
          data.fields.map((f) => [f.key, '']),
        ),
      });
      setSaveMessage(null);

      // Update the carrier in the list with masked credentials
      setCarriers((prev) =>
        prev.map((c) =>
          c.carrierId === carrierId ? { ...c, ...data, maskedCredentials: data.maskedCredentials } : c,
        ),
      );
    } catch (err) {
      console.error('Failed to load carrier details:', err);
    }
  };

  const handleSave = async (carrierId: string) => {
    if (!formState) return;

    try {
      setSaving(true);
      setSaveMessage(null);
      await carrierSettingsApi.update(carrierId, {
        enabled: formState.enabled,
        sandbox: formState.sandbox,
        credentials: formState.credentials,
      });
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      await loadCarriers();
      // Reload the expanded carrier details
      const response = await carrierSettingsApi.get(carrierId) as { data: CarrierInfo & { maskedCredentials: Record<string, string> } };
      setCarriers((prev) =>
        prev.map((c) =>
          c.carrierId === carrierId ? { ...c, ...response.data, maskedCredentials: response.data.maskedCredentials } : c,
        ),
      );
      // Clear credential inputs after save
      setFormState((prev) =>
        prev
          ? {
              ...prev,
              credentials: Object.fromEntries(
                Object.keys(prev.credentials).map((k) => [k, '']),
              ),
            }
          : prev,
      );
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (carrierId: string) => {
    try {
      setTesting(carrierId);
      const response = await carrierSettingsApi.test(carrierId) as { data: { success: boolean; message: string } };
      const result = response.data;
      setSaveMessage({
        type: result.success ? 'success' : 'error',
        text: result.message,
      });
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Connection test failed.' });
      console.error(err);
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Carrier Settings</h1>
        <p>Loading carrier settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Carrier Settings</h1>
        <p style={{ color: '#d32f2f' }}>{error}</p>
        <button onClick={loadCarriers} style={buttonStyle}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Carrier Settings</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Configure API credentials for each shipping carrier. Credentials are stored securely and used for live rate shopping.
      </p>

      {carriers.map((carrier) => {
        const isExpanded = expandedCarrier === carrier.carrierId;

        return (
          <div
            key={carrier.carrierId}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              marginBottom: '12px',
              backgroundColor: '#fff',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              onClick={() => handleExpand(carrier.carrierId)}
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                backgroundColor: isExpanded ? '#f0f7ff' : '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{carrier.name}</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: carrier.enabled ? '#e8f5e9' : '#f5f5f5',
                    color: carrier.enabled ? '#2e7d32' : '#999',
                  }}
                >
                  {carrier.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: carrier.configured ? '#e3f2fd' : '#fff3e0',
                    color: carrier.configured ? '#1565c0' : '#e65100',
                  }}
                >
                  {carrier.configured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#999' }}>{isExpanded ? '▲' : '▼'}</span>
            </div>

            {/* Expanded content */}
            {isExpanded && formState && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid #eee' }}>
                <p style={{ color: '#666', fontSize: '0.9rem', margin: '16px 0' }}>
                  {carrier.description}
                </p>

                {/* Enable/Sandbox toggles */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formState.enabled}
                      onChange={(e) => setFormState({ ...formState, enabled: e.target.checked })}
                    />
                    <span>Enabled</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formState.sandbox}
                      onChange={(e) => setFormState({ ...formState, sandbox: e.target.checked })}
                    />
                    <span>Sandbox Mode</span>
                  </label>
                </div>

                {/* Credential fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {carrier.fields.map((field) => {
                    const maskedValue = carrier.maskedCredentials?.[field.key] || '';

                    return (
                      <div key={field.key}>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                          }}
                        >
                          {field.label}
                          {field.required && <span style={{ color: '#d32f2f' }}> *</span>}
                        </label>
                        {maskedValue && (
                          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>
                            Current: {maskedValue}
                          </div>
                        )}
                        <input
                          type={field.secret ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={formState.credentials[field.key] || ''}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              credentials: {
                                ...formState.credentials,
                                [field.key]: e.target.value,
                              },
                            })
                          }
                          style={inputStyle}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Save message */}
                {saveMessage && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      backgroundColor: saveMessage.type === 'success' ? '#e8f5e9' : '#ffebee',
                      color: saveMessage.type === 'success' ? '#2e7d32' : '#c62828',
                      fontSize: '0.9rem',
                    }}
                  >
                    {saveMessage.text}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button
                    onClick={() => handleSave(carrier.carrierId)}
                    disabled={saving}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#1976d2',
                      color: '#fff',
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                  <button
                    onClick={() => handleTest(carrier.carrierId)}
                    disabled={testing === carrier.carrierId}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#fff',
                      color: '#1976d2',
                      border: '1px solid #1976d2',
                      opacity: testing === carrier.carrierId ? 0.6 : 1,
                    }}
                  >
                    {testing === carrier.carrierId ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '6px',
  border: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #ddd',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
};
