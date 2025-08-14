import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, ArrowRight, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'advogado' | 'cliente';
}

type SearchCategory = 'processos' | 'clientes' | 'assuntos';

// Mock data removed - implement real search functionality
const mockResults = {
  processos: [],
  clientes: [],
  assuntos: [],
};

const categories = [
  { key: 'processos' as SearchCategory, label: 'Processos', icon: FileText },
  { key: 'clientes' as SearchCategory, label: 'Clientes', icon: Users },
  { key: 'assuntos' as SearchCategory, label: 'Assuntos', icon: Clock },
];

export function CommandPalette({ isOpen, onClose, userType }: CommandPaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('processos');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setActiveCategory('processos');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const results = mockResults[activeCategory];
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          navigate(selected.href);
          onClose();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = categories.findIndex(c => c.key === activeCategory);
        const nextIndex = (currentIndex + 1) % categories.length;
        setActiveCategory(categories[nextIndex].key);
        setSelectedIndex(0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeCategory, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  const results = mockResults[activeCategory];
  const filteredResults = results.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (item: typeof results[0]) => {
    navigate(item.href);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 animate-fade-in">
        <div className="bg-white rounded-lg shadow-strong border border-border overflow-hidden mx-4">
          {/* Search Input */}
          <div className="flex items-center p-4 border-b border-border">
            <Search className="w-5 h-5 text-neutral-400 mr-3" />
            <Input
              ref={inputRef}
              placeholder="Buscar processos, clientes ou assuntos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 text-base"
            />
          </div>

          {/* Categories */}
          <div className="flex border-b border-border">
            {categories.map((category) => {
              const Icon = category.icon;
              const count = mockResults[category.key].length;
              
              return (
                <button
                  key={category.key}
                  onClick={() => {
                    setActiveCategory(category.key);
                    setSelectedIndex(0);
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors',
                    activeCategory === category.key
                      ? 'text-brand-700 bg-brand-50 border-b-2 border-brand-700'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {category.label}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {filteredResults.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Search className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-neutral-900 mb-2">
                  Nenhum resultado encontrado
                </h3>
                <p className="text-xs text-neutral-600">
                  Tente ajustar os termos de busca ou selecionar outra categoria
                </p>
              </div>
            ) : (
              <div className="py-2">
                {filteredResults.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                      index === selectedIndex
                        ? 'bg-brand-50 text-brand-900'
                        : 'hover:bg-neutral-50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-neutral-600 truncate mt-1">
                        {item.subtitle}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400 ml-2 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-neutral-50 border-t border-border">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center space-x-4">
                <span><kbd className="px-1.5 py-0.5 bg-white border rounded">↑↓</kbd> navegar</span>
                <span><kbd className="px-1.5 py-0.5 bg-white border rounded">Enter</kbd> selecionar</span>
                <span><kbd className="px-1.5 py-0.5 bg-white border rounded">Tab</kbd> categoria</span>
              </div>
              <span>ESC para fechar</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
