import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { returnsApi, ordersApi } from '../services/api';
import { DataTable, StatusBadge, Modal } from '../components';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReturnEvent } from '../types';

interface ReturnFormData {
  originalOrderId: string;
  boxCount: number;
  boxes: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
  }>;
  carrier: string;
  fromAddress: {
    name: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
  };
}

export function ReturnsPage() {
  const queryClient = useQueryClient();
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [boxCount, setBoxCount] = useState(1);
  const [formData, setFormData] = useState<ReturnFormData>({
    originalOrderId: '',
    boxCount: 1,
    boxes: [{ weight: 1, length: 10, width: 10, height: 10 }],
    carrier: 'ups',
    fromAddress: { name: '', street1: '', city: '', state: '', zip: '' },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['returns'],
    queryFn: () => returnsApi.list(),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'select'],
    queryFn: () => ordersApi.list({ page: 1, limit: 100 }),
    enabled: showReturnModal,
  });

  const createReturnMutation = useMutation({
    mutationFn: (data: ReturnFormData) => returnsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      setShowReturnModal(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      originalOrderId: '',
      boxCount: 1,
      boxes: [{ weight: 1, length: 10, width: 10, height: 10 }],
      carrier: 'ups',
      fromAddress: { name: '', street1: '', city: '', state: '', zip: '' },
    });
    setBoxCount(1);
  };

  const handleBoxCountChange = (count: number) => {
    setBoxCount(count);
    const currentBoxes = formData.boxes;
    if (count > currentBoxes.length) {
      const newBoxes = [...currentBoxes];
      for (let i = currentBoxes.length; i < count; i++) {
        newBoxes.push({ weight: 1, length: 10, width: 10, height: 10 });
      }
      setFormData({ ...formData, boxes: newBoxes, boxCount: count });
    } else {
      setFormData({ ...formData, boxes: currentBoxes.slice(0, count), boxCount: count });
    }
  };

  const handleBoxChange = (index: number, field: string, value: number) => {
    const newBoxes = [...formData.boxes];
    newBoxes[index] = { ...newBoxes[index], [field]: value };
    setFormData({ ...formData, boxes: newBoxes });
  };

  const columns: ColumnDef<ReturnEvent>[] = [
    {
      accessorKey: 'id',
      header: 'Return ID',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('id')}</span>
      ),
    },
    {
      accessorKey: 'originalOrderId',
      header: 'Order ID',
    },
    {
      accessorKey: 'boxCount',
      header: 'Boxes',
      cell: ({ row }) => <span>{row.getValue('boxCount')}</span>,
    },
    {
      accessorKey: 'carrier',
      header: 'Carrier',
      cell: ({ row }) => (
        <span className="uppercase font-medium">{row.getValue('carrier')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
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
        const returnEvent = row.original;
        return (
          <div className="flex items-center gap-2">
            {returnEvent.status === 'pending' && (
              <button className="text-sm text-ship-accent hover:text-sky-600">
                Generate Labels
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
          <p className="text-gray-500 mt-1">Manage return shipments and processing</p>
        </div>
        <button onClick={() => setShowReturnModal(true)} className="btn-primary">
          Create Return
        </button>
      </div>

      {/* Returns Table */}
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
            <h2 className="text-lg font-semibold text-red-600">Error Loading Returns</h2>
            <p className="text-gray-500 mt-2">Please try again later.</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['returns'] })}
              className="btn-primary mt-4"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          {data?.items?.length ? (
            <DataTable<ReturnEvent> data={data.items as ReturnEvent[]} columns={columns} pageSize={10} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No returns found</p>
              <button
                onClick={() => setShowReturnModal(true)}
                className="btn-primary mt-4"
              >
                Create First Return
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Return Modal */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          resetForm();
        }}
        title="Create Return"
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setShowReturnModal(false);
                resetForm();
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => createReturnMutation.mutate(formData)}
              disabled={createReturnMutation.isPending || !formData.originalOrderId}
              className="btn-primary"
            >
              {createReturnMutation.isPending ? 'Creating...' : 'Create Return'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Order Selection */}
          <div>
            <label className="label-text">Select Order</label>
            <select
              value={formData.originalOrderId}
              onChange={(e) => setFormData({ ...formData, originalOrderId: e.target.value })}
              className="input-field"
            >
              <option value="">Select an order...</option>
              {ordersData?.items?.map((order: any) => (
                <option key={order.id} value={order.id}>
                  {order.id} - {order.customerName}
                </option>
              ))}
            </select>
          </div>

          {/* Carrier Selection */}
          <div>
            <label className="label-text">Return Carrier</label>
            <select
              value={formData.carrier}
              onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
              className="input-field"
            >
              <option value="ups">UPS</option>
              <option value="fedex">FedEx</option>
              <option value="usps">USPS</option>
            </select>
          </div>

          {/* Box Count */}
          <div>
            <label className="label-text">Number of Boxes</label>
            <input
              type="number"
              min={1}
              max={10}
              value={boxCount}
              onChange={(e) => handleBoxCountChange(Number(e.target.value))}
              className="input-field w-32"
            />
          </div>

          {/* Box Details */}
          <div>
            <label className="label-text">Box Details</label>
            <div className="space-y-4 mt-2">
              {formData.boxes.map((box, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-3">Box {index + 1}</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Weight (lbs)</label>
                      <input
                        type="number"
                        value={box.weight}
                        onChange={(e) => handleBoxChange(index, 'weight', Number(e.target.value))}
                        className="input-field"
                        min={0.1}
                        step={0.1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Length (in)</label>
                      <input
                        type="number"
                        value={box.length}
                        onChange={(e) => handleBoxChange(index, 'length', Number(e.target.value))}
                        className="input-field"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Width (in)</label>
                      <input
                        type="number"
                        value={box.width}
                        onChange={(e) => handleBoxChange(index, 'width', Number(e.target.value))}
                        className="input-field"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Height (in)</label>
                      <input
                        type="number"
                        value={box.height}
                        onChange={(e) => handleBoxChange(index, 'height', Number(e.target.value))}
                        className="input-field"
                        min={1}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Address */}
          <div>
            <label className="label-text">Return From Address</label>
            <div className="space-y-3 mt-2">
              <input
                type="text"
                placeholder="Name"
                value={formData.fromAddress.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fromAddress: { ...formData.fromAddress, name: e.target.value },
                  })
                }
                className="input-field"
              />
              <input
                type="text"
                placeholder="Street Address"
                value={formData.fromAddress.street1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fromAddress: { ...formData.fromAddress, street1: e.target.value },
                  })
                }
                className="input-field"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  value={formData.fromAddress.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fromAddress: { ...formData.fromAddress, city: e.target.value },
                    })
                  }
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={formData.fromAddress.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fromAddress: { ...formData.fromAddress, state: e.target.value },
                    })
                  }
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="ZIP"
                  value={formData.fromAddress.zip}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fromAddress: { ...formData.fromAddress, zip: e.target.value },
                    })
                  }
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
