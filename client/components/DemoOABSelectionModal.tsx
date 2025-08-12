import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useDemoAuth } from '../contexts/DemoAuthContext';

interface DemoOABSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function DemoOABSelectionModal({ open, onOpenChange }: DemoOABSelectionModalProps) {
  const [oabNumber, setOabNumber] = useState('');
  const [uf, setUf] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { selectOAB } = useDemoAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oabNumber || !uf) return;

    setIsLoading(true);
    try {
      await selectOAB(parseInt(oabNumber));
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to select OAB:', error);
      alert(error.message || 'Erro ao selecionar OAB. Tente o número 123456 para teste.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar meu registro OAB (Demo)</DialogTitle>
          <DialogDescription>
            Para continuar no modo demo, precisamos vincular sua conta ao seu registro na OAB.
            <br />
            <strong>Para teste:</strong> Use OAB 123456 ou 654321
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oab-number">Número OAB</Label>
            <Input
              id="oab-number"
              type="text"
              placeholder="123456"
              value={oabNumber}
              onChange={(e) => setOabNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf">UF</Label>
            <Select value={uf} onValueChange={setUf} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a UF" />
              </SelectTrigger>
              <SelectContent>
                {UF_OPTIONS.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !oabNumber || !uf}>
              {isLoading ? 'Confirmando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
