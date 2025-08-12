import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcuts {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  const navigate = useNavigate();

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement).contentEditable === 'true'
    ) {
      return;
    }

    const key = event.key.toLowerCase();
    const combo = [];

    if (event.ctrlKey) combo.push('ctrl');
    if (event.metaKey) combo.push('cmd');
    if (event.altKey) combo.push('alt');
    if (event.shiftKey) combo.push('shift');
    combo.push(key);

    const keyCombo = combo.join('+');

    // Handle sequential key presses (like 'g+p')
    if (shortcuts[keyCombo]) {
      event.preventDefault();
      shortcuts[keyCombo]();
      return;
    }

    // Handle 'g' followed by another key
    if (key === 'g') {
      const handleSecondKey = (secondEvent: KeyboardEvent) => {
        const secondKey = secondEvent.key.toLowerCase();
        const sequence = `g+${secondKey}`;
        
        if (shortcuts[sequence]) {
          secondEvent.preventDefault();
          shortcuts[sequence]();
        }
        
        // Remove the listener after first key press
        document.removeEventListener('keydown', handleSecondKey);
      };

      // Wait for the next key press
      setTimeout(() => {
        document.addEventListener('keydown', handleSecondKey, { once: true });
      }, 10);
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Provide navigation function to shortcuts
  const shortcutsWithNavigation = {
    ...shortcuts,
    'g+p': () => navigate('/processos'),
    'g+c': () => navigate('/clientes'),
    'g+j': () => navigate('/jornadas'),
    'g+i': () => navigate('/inbox'),
    'g+a': () => navigate('/agenda'),
    'g+d': () => navigate('/documentos'),
    'g+f': () => navigate('/financeiro'),
    'g+r': () => navigate('/relatorios'),
    'g+h': () => navigate('/helpdesk'),
    'g+s': () => navigate('/servicos'),
    'g+home': () => navigate('/'),
  };

  return shortcutsWithNavigation;
}

// Hook for displaying keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const shortcuts = [
    { key: '⌘ K', description: 'Busca global' },
    { key: '? ', description: 'Mostrar atalhos' },
    { key: 'G P', description: 'Ir para Processos' },
    { key: 'G C', description: 'Ir para Clientes' },
    { key: 'G J', description: 'Ir para Jornadas' },
    { key: 'G I', description: 'Ir para Inbox' },
    { key: 'G A', description: 'Ir para Agenda' },
    { key: 'G D', description: 'Ir para Documentos' },
    { key: 'G F', description: 'Ir para Financeiro' },
    { key: 'G R', description: 'Ir para Relatórios' },
    { key: 'G H', description: 'Ir para Helpdesk' },
    { key: 'G S', description: 'Ir para Serviços' },
    { key: 'Esc', description: 'Fechar modais' },
  ];

  return shortcuts;
}
