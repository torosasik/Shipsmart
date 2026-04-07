import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shipmentsApi, ratesApi } from '../services/api';
import { DataTable, StatusBadge } from '../components';
import { RateComparisonPanel } from '../components/RateComparisonPanel';
import type { ColumnDef } from '@tanstack/react-table';
import type { Shipment, CarrierQuote } from '../types';
import { Link } from 'react-router-dom';

export function ShipmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showRatePanel, setShowRatePanel] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['shipments', page, pageSize],
    queryFn: () => shipmentsApi.list({ page, limit: pageSize }),
  });

  const { data: ratesData, isLoading: ratesLoading } = useQuery({
    queryKey: ['rates', selectedOrderId],
    queryFn: () => ratesApi.shopRates({ orderId: selectedOrderId }),
    enabled: !!selectedOrderId && showRatePanel,
  });

  const columns: ColumnDef<Shipment>[] = [
    {
      accessorKey: 'id',
      header: 'Shipment ID',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('id')}</span>
      ),
    },
    {
      accessorKey: 'orderId',
      header: 'Order ID',
      cell: ({ row }) => (
        <Link
          to={`/orders?id=${row.getValue('orderId')}`}
          className="text-ship-accent hover:text-sky-600"
        >
          {row.getValue('orderId')}
        </Link>
      ),
    },
    {
      accessorKey: 'carrier',
      header: 'Carrier',
      cell: ({ row }) => {
        const carrier = row.getValue('carrier') as string;
        return <span className="uppercase font-medium">{carrier}</span>;
      },
    },
    {
      accessorKey: 'serviceLevel',
      header: 'Service',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
    },
    {
      accessorKey: 'trackingNumbers',
      header: 'Tracking',
      cell: ({ row }) => {
        const tracking = row.getValue('trackingNumbers') as string[];
        return tracking?.length ? (
          <span className="font-mono text-sm">{tracking[0]}</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: 'totalCost',
      header: 'Cost',
      cell: ({ row }) => {
        const cost = row.getValue('totalCost') as number;
        return cost ? `$${cost.toFixed(2)}` : '-';
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => {
        const date = row.getValue('createdAt');
        return date ? new Date(date as string).toLocaleDateString() : '-';
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-500 mt-1">Track and manage all shipments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRatePanel(!showRatePanel)}
            className="btn-secondary"
          >
            {showRatePanel ? 'Hide Rates' : 'Get Rates'}
          </button>
          <Link to="/orders" className="btn-primary">
            Create Shipment
          </Link>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className={`flex-1 ${showRatePanel ? '' : ''}`}>
          {/* Shipments Table */}
          {isLoading ? (
            <div className="card">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-full"></div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="card">
              <div className="text-center py-8">
                <h2 className="text-lg font-semibold text-red-600">Error Loading Shipments</h2>
                <p className="text-gray-500 mt-2">Please try again later.</p>
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['shipments'] })}
                  className="btn-primary mt-4"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              {data?.items?.length ? (
                <>
                  <DataTable<Shipment>
                    data={data.items as Shipment[]}
                    columns={columns}
                    pageSize={pageSize}
                  />
                  
                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Show</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        className="input-field w-20"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn-secondary disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-500">
                        Page {page} of {Math.ceil((data?.total || 0) / pageSize)}
                      </span>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!data?.hasMore}
                        className="btn-secondary disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No shipments found</p>
                  <Link to="/orders" className="btn-primary mt-4 inline-block">
                    Create First Shipment
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rate Comparison Panel */}
        {showRatePanel && (
          <div className="w-96 shrink-0">
            <div className="sticky top-6">
              <div className="mb-4">
                <label className="label-text">Enter Order ID for Rate Quote</label>
                <input
                  type="text"
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  placeholder="Enter order ID"
                  className="input-field"
                />
              </div>
              <RateComparisonPanel
                quotes={(ratesData?.data as CarrierQuote[]) || []}
                isLoading={ratesLoading}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
