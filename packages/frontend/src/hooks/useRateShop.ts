import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ratesApi } from '../services/api';

export function useRateShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ratesApi.shopRates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
    },
  });
}
