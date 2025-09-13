import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGallery, deleteImage } from '../api/galleryClient';

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

export function useDeleteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filename: string) => deleteImage(filename),
    onSuccess: () => {
      // Invalidate and refetch the gallery query to show the updated list
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
    onError: (error) => {
      // TODO: Handle error with a toast notification
      console.error('Failed to delete image:', error);
    }
  });
}
