import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../services/api';
import { DataTable, StatusBadge } from '../components';
import type { ColumnDef } from '@tanstack/react-table';
import type { Order } from '../types';
import { Link } from 'react-router-dom';

export function OrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', page, pageSize, statusFilter],
    queryFn: () => ordersApi.list({ page, limit: pageSize, ...(statusFilter && { status: statusFilter }) }),
  });

  const syncMutation = useMutation({
    mutationFn: () => ordersApi.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: 'id',
      header: 'Order ID',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('id')}</span>
      ),
    },
    {
      accessorKey: 'shopifyOrderId',
      header: 'Shopify ID',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-gray-500">
          {row.getValue('shopifyOrderId') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
    },
    {
      accessorKey: 'customerEmail',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-gray-500">{row.getValue('customerEmail')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
    },
    {
      accessorKey: 'lineItems',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.getValue('lineItems') as unknown[];
        return <span>{items?.length || 0}</span>;
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
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link
              to={`/shipments?orderId=${order.id}`}
              className="text-sm text-ship-accent hover:text-sky-600"
            >
              Create Shipment
            </Link>
          </div>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="card">
          <div className="text-center py-8">
            <h2 className="text-lg font-semibold text-red-600">Error Loading Orders</h2>
            <p className="text-gray-500 mt-2">Please try again later.</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
              className="btn-primary mt-4"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">Manage and process incoming orders</p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="btn-primary"
        >
          {syncMutation.isPending ? 'Syncing...' : 'Sync from Shopify'}
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input-field max-w-xs"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="shipped">Shipped</option>
            <option value="returned">Returned</option>
            <option value="consolidated">Consolidated</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="card">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-full"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          {data?.items?.length ? (
            <>
              <DataTable<Order>
                data={data.items as Order[]}
                columns={columns}
                pageSize={pageSize}
              />
              
              {/* Pagination Controls */}
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
                  <span className="text-sm text-gray-500">per page</span>
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
              <p className="text-gray-500">No orders found</p>
              <button
                onClick={() => syncMutation.mutate()}
                className="btn-primary mt-4"
              >
                Sync from Shopify
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
