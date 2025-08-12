import React from 'react';
import { SupabaseSetup } from '../components/SupabaseSetup';
import { Scale } from 'lucide-react';

export function Setup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg">
              <Scale className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LegalFlow</h1>
          <p className="text-gray-600 mt-2">Sistema de Gestão Jurídica</p>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
            Bem-vindo! Para começar a usar o sistema, você precisa configurar a conexão com seu banco de dados Supabase.
          </p>
        </div>

        <SupabaseSetup />
      </div>
    </div>
  );
}
