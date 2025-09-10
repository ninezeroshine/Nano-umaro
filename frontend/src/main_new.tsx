import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './ui2/AppShell';

const qc = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <AppShell />
    </QueryClientProvider>
  </React.StrictMode>
);


