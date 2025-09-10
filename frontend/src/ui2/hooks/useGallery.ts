import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchGallery } from '../api/galleryClient';

export function useGallery() {
  return useInfiniteQuery({
    queryKey: ['gallery'],
    queryFn: ({ pageParam = 1 }) => fetchGallery(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 минут
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}
