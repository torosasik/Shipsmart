import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consolidationApi } from '../services/api';
import type { Order } from '../types';

interface ConsolidationOpportunity {
  id: string;
  orders: Order[];
  potentialSavings: number;
  recommendedBoxes: number;
}

export function ConsolidationPage() {
  const queryClient = useQueryClient();
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['consolidation', 'opportunities'],
    queryFn: () => consolidationApi.opportunities(),
  });

  const applyMutation = useMutation({
    mutationFn: (orderIds: string[]) => 
      consolidationApi.apply({ orderIds, boxes: [], notes: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidation'] });
      setSelectedOpportunities([]);
    },
  });

  const opportunities = (data?.data as ConsolidationOpportunity[]) || [];

  const handleToggleOpportunity = (id: string) => {
    setSelectedOpportunities((prev) => 
      prev.includes(id) 
        ? prev.filter((o) => o !== id)
        : [...prev, id]
    );
  };

  const totalPotentialSavings = opportunities.reduce(
    (sum, opp) => sum + opp.potentialSavings,
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consolidation</h1>
          <p className="text-gray-500 mt-1">Find opportunities to save on shipping costs</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => refetch()} className="btn-secondary">
            Refresh
          </button>
          <button
            onClick={() => applyMutation.mutate(
              opportunities
                .filter((o) => selectedOpportunities.includes(o.id))
                .flatMap((o) => o.orders.map((ord) => ord.id))
            )}
            disabled={selectedOpportunities.length === 0 || applyMutation.isPending}
            className="btn-primary"
          >
            {applyMutation.isPending ? 'Applying...' : 'Apply Consolidation'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Opportunities Found</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{opportunities.length}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Total Potential Savings</p>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            ${totalPotentialSavings.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Orders to Consolidate</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {selectedOpportunities.length}
          </p>
        </div>
      </div>

      {/* Opportunities List */}
      {isLoading ? (
        <div className="card">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="card">
          <div className="text-center py-8">
            <h2 className="text-lg font-semibold text-red-600">Error Loading Opportunities</h2>
            <p className="text-gray-500 mt-2">Please try again later.</p>
            <button onClick={() => refetch()} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="card">
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">No Consolidation Opportunities</h2>
            <p className="text-gray-500 mt-2">
              All orders have been processed or there are no matching orders to consolidate.
            </p>
            <button onClick={() => refetch()} className="btn-primary mt-4">
              Check Again
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => {
            const isSelected = selectedOpportunities.includes(opp.id);
            return (
              <div
                key={opp.id}
                className={`card cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-ship-accent' : ''
                }`}
                onClick={() => handleToggleOpportunity(opp.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleOpportunity(opp.id)}
                        className="w-5 h-5 text-ship-accent rounded"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {opp.orders.length} Orders to Consolidate
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Order IDs: {opp.orders.map((o) => o.id).join(', ')}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-sm">
                          <span className="text-gray-500">Recommended Boxes:</span>{' '}
                          <span className="font-medium">{opp.recommendedBoxes}</span>
                        </span>
                        <span className="text-sm">
                          <span className="text-gray-500">Potential Savings:</span>{' '}
                          <span className="font-medium text-green-600">
                            ${opp.potentialSavings.toFixed(2)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${opp.potentialSavings.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">savings</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert for New Opportunities */}
      {opportunities.length > 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-900">How Consolidation Works</h4>
              <p className="text-sm text-blue-700">
                Select orders that ship to the same destination within a few days of each other.
                We'll combine them into fewer boxes to maximize savings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
