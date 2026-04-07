import { useQuery } from '@tanstack/react-query';
import { healthApi, type HealthData, type ServiceInfo } from '../services/api';

function StatusDot({ status }: { status: ServiceInfo['status'] }) {
  if (status === 'healthy') {
    return <span className="inline-block w-3 h-3 rounded-full bg-green-500" title="Healthy" />;
  }
  if (status === 'unhealthy') {
    return <span className="inline-block w-3 h-3 rounded-full bg-red-500" title="Unhealthy" />;
  }
  return <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" title="Unconfigured" />;
}

function StatusBadge({ status }: { status: ServiceInfo['status'] }) {
  const classes =
    status === 'healthy'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : status === 'unhealthy'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}

function ServiceCard({ name, info }: { name: string; info: ServiceInfo }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center gap-3">
        <StatusDot status={info.status} />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{info.message}</p>
        </div>
      </div>
      <StatusBadge status={info.status} />
    </div>
  );
}

function OverallBadge({ status }: { status: HealthData['status'] }) {
  const classes =
    status === 'healthy'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : status === 'degraded'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${classes}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function HealthCheckPage() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.get,
    refetchInterval: 30_000,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">System Health</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Last checked: {lastUpdated} · Auto-refreshes every 30s
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {data && <OverallBadge status={data.status} />}
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          Failed to load health status. Is the backend running?
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Core Services */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Core Services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ServiceCard name="API" info={data.services.api} />
              <ServiceCard name="Firebase / Firestore" info={data.services.firebase} />
            </div>
          </section>

          {/* Carrier Integrations */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Carrier Integrations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(data.services.carriers).map(([carrier, info]) => (
                <ServiceCard key={carrier} name={carrier} info={info} />
              ))}
            </div>
          </section>

          <p className="text-xs text-gray-400 dark:text-gray-600">
            Version {data.version} · {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
