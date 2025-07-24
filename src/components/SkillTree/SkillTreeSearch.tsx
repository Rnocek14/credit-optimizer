import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';

interface SkillTreeSearchProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

export const SkillTreeSearch: React.FC<SkillTreeSearchProps> = ({
  nodes,
  setNodes
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      // Reset all nodes to normal state
      setNodes(nodes => 
        nodes.map(node => ({
          ...node,
          style: {
            ...node.style,
            opacity: 1,
            filter: 'none'
          }
        }))
      );
      return;
    }

    // Highlight matching nodes and dim others
    setNodes(nodes => 
      nodes.map(node => {
        const isMatch = 
          String(node.data.name || '').toLowerCase().includes(term.toLowerCase()) ||
          String(node.data.title || '').toLowerCase().includes(term.toLowerCase()) ||
          String(node.data.category || '').toLowerCase().includes(term.toLowerCase()) ||
          String(node.data.trackCategory || '').toLowerCase().includes(term.toLowerCase());

        return {
          ...node,
          style: {
            ...node.style,
            opacity: isMatch ? 1 : 0.3,
            filter: isMatch ? 'brightness(1.1)' : 'none'
          }
        };
      })
    );
  }, [setNodes]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    handleSearch('');
    setIsSearchVisible(false);
  }, [handleSearch]);

  if (!isSearchVisible) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsSearchVisible(true)}
        className="absolute top-4 left-4 z-10 bg-white shadow-sm"
      >
        <Search className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search skills, steps, or categories..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10 w-64 bg-white shadow-sm"
          autoFocus
        />
        {searchTerm && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsSearchVisible(false)}
        className="bg-white shadow-sm"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};