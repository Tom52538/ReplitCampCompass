import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFilter: () => void;
}

export const SearchBar = ({ onSearch, onFilter }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const { t } = useLanguage();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  // Legend-based search terms mapping
  const legendSearchTerms: Record<string, string[]> = {
    'bungalows': ['bungalow', 'b1', 'b5', 'ba comfort', 'bc comfort', 'bd comfort', 'be comfort', 'bf comfort'],
    'beach_houses': ['beach house', 'beach house 4', 'beach house 6a', 'beach house 6b'],
    'chalets': ['chalet', 'rp64a', 'rp4a', 'rp6a', 'rp6b', 'rp6c', 'rp6gc'],
    'camping': ['caravan', 'camping', 'campsite', 'comfort camping', 'royal camping'],
    'lodges': ['lodge', 'water village', 'lodge 4'],
    'services': ['reception', 'shop', 'service station', 'office', 'bike hire'],
    'necessities': ['first aid', 'ehbo', 'aed', 'information', 'parking'],
    'food_drinks': ['restaurant', 'beach club', 'terrace', 'snack bar', 'pizzeria'],
    'leisure': ['kids club', 'mini golf', 'playground', 'sports', 'volleyball', 'tennis', 'adventure'],
    'facilities': ['toilet', 'parking', 'waste point', 'launderette', 'washing']
  };

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // First, try direct API search
      let response = await fetch(`/api/pois/search?q=${encodeURIComponent(searchTerm)}&site=${currentSite}`);
      if (!response.ok) throw new Error('Search failed');

      let results = await response.json();

      // If no direct results, try legend-based category search
      if (results.length === 0) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        for (const [category, terms] of Object.entries(legendSearchTerms)) {
          if (terms.some(term => term.toLowerCase().includes(lowerSearchTerm) || lowerSearchTerm.includes(term.toLowerCase()))) {
            response = await fetch(`/api/pois/search?category=${category}&site=${currentSite}`);
            if (response.ok) {
              const categoryResults = await response.json();
              results = [...results, ...categoryResults];
            }
          }
        }
      }

      setSearchResults(results.slice(0, 10)); // Limit results
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="w-full relative">
      <div className="bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center px-5 py-3">
          <Search className="text-gray-500 w-4 h-4 mr-3 flex-shrink-0" />
          <Input
            type="text"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={handleInputChange}
            className="border-none shadow-none p-0 focus-visible:ring-0 text-sm bg-transparent flex-1 text-gray-800 placeholder-gray-400"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onFilter}
            className="text-gray-500 hover:text-green-600 p-1 ml-2 flex-shrink-0 rounded-full hover:bg-green-50/50 transition-all duration-200"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};