import { useMutation } from '@tanstack/react-query';
import { generateImages } from '../api/generateClient';
import type { GenerateRequest, GenerateResponse } from '../types/generate';

export function useGenerate() {
  const controllerRef: { current?: AbortController } = { current: undefined };
  const mutation = useMutation<GenerateResponse, Error, GenerateRequest>({
    mutationFn: async (vars) => {
      controllerRef.current?.abort();
      controllerRef.current = new AbortController();
      const res = await generateImages(vars, controllerRef.current.signal);
      return res;
    },
  });
  return Object.assign(mutation, {
    cancel: () => controllerRef.current?.abort(),
  });
}


