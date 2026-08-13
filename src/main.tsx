import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { EmpresaProvider } from './context/EmpresaContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { CrmProvider } from './context/CrmContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <EmpresaProvider>
        <CrmProvider>
          <App />
        </CrmProvider>
      </EmpresaProvider>
    </AuthProvider>
  </StrictMode>,
);
