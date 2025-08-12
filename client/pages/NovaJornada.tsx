import React from 'react';
import { useNavigate } from 'react-router-dom';
import { JourneyDesigner } from '../components/JourneyDesigner';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function NovaJornada() {
  const navigate = useNavigate();

  const handleSave = (templateData: any) => {
    // In real app, would save to Supabase
    console.log('Saving new journey template:', templateData);
    
    // Mock save success
    alert('Template de jornada criado com sucesso!');
    navigate('/jornadas');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/jornadas')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Template de Jornada</h1>
          <p className="text-gray-600 mt-1">
            Crie um novo template customizável para automatizar processos
          </p>
        </div>
      </div>

      <JourneyDesigner onSave={handleSave} />
    </div>
  );
}
