import type { CarrierQuote } from '../types';

// Local carrier names mapping (since @shipsmart/shared may not be built)
const CARRIER_NAMES: Record<string, string> = {
  ups: 'UPS',
  fedex: 'FedEx',
  usps: 'USPS',
  shippo: 'Shippo',
  ltl: 'Freight (LTL)',
};

interface RateComparisonPanelProps {
  quotes: CarrierQuote[];
  selectedQuoteId?: string;
  onSelectQuote?: (quote: CarrierQuote) => void;
  isLoading?: boolean;
}

export function RateComparisonPanel({
  quotes,
  selectedQuoteId,
  onSelectQuote,
  isLoading = false,
}: RateComparisonPanelProps) {
  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Rate Comparison</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center justify-between p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!quotes.length) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Rate Comparison</h3>
        <p className="text-gray-500 text-center py-8">
          No rates available. Enter shipment details to get rates.
        </p>
      </div>
    );
  }

  const sortedQuotes = [...quotes].sort((a, b) => a.rate - b.rate);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Rate Comparison</h3>
      <div className="space-y-3">
        {sortedQuotes.map((quote, index) => {
          const carrierName = CARRIER_NAMES[quote.carrier] || quote.carrier;
          const isSelected = selectedQuoteId === `${quote.carrier}-${index}`;
          
          return (
            <button
              key={`${quote.carrier}-${index}`}
              onClick={() => onSelectQuote?.(quote)}
              disabled={!onSelectQuote}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                isSelected 
                  ? 'border-ship-accent bg-ship-light' 
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              } ${onSelectQuote ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-center gap-3">
                {/* Carrier icon placeholder */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                  quote.carrier === 'ups' ? 'bg-orange-100 text-orange-600' :
                  quote.carrier === 'fedex' ? 'bg-purple-100 text-purple-600' :
                  quote.carrier === 'usps' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {carrierName.substring(0, 3).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{carrierName}</p>
                  <p className="text-sm text-gray-500">{quote.serviceLevel}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">
                  ${quote.rate.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">
                  {quote.estimatedDays} day{quote.estimatedDays !== 1 ? 's' : ''}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Cheapest:</span>
          <span className="font-medium">
            {sortedQuotes[0] ? `${CARRIER_NAMES[sortedQuotes[0].carrier]} (${sortedQuotes[0].rate.toFixed(2)})` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-500">Fastest:</span>
          <span className="font-medium">
            {sortedQuotes.find(q => q.isFastest) ? `${CARRIER_NAMES[sortedQuotes.find(q => q.isFastest)!.carrier]} (${sortedQuotes.find(q => q.isFastest)!.estimatedDays} days)` : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}