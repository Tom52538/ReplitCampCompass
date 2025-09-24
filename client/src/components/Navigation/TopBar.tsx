import { SearchBar } from './SearchBar';
import { Coordinates } from '@/types/navigation';

interface TopBarProps {
  currentPosition: Coordinates;
  onSearch: (query: string) => void;
  onFilter: () => void;
}

export const TopBar = ({ currentPosition, onSearch, onFilter }: TopBarProps) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 pt-safe-top">
      <div className="px-4 pt-4 pb-2">
        <div className="max-w-xs">
          <SearchBar onSearch={onSearch} onFilter={onFilter} />
        </div>
      </div>
    </div>
  );
};
