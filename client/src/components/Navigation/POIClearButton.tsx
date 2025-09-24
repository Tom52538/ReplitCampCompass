import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface POIClearButtonProps {
  onClear: () => void;
  disabled?: boolean;
}

export const POIClearButton = ({ onClear, disabled }: POIClearButtonProps) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        console.log('Clear POI button clicked');
        onClear();
      }}
      disabled={disabled}
      className="text-red-600 border-red-300 hover:bg-red-50"
    >
      <X className="w-4 h-4 mr-1" />
      Clear POIs
    </Button>
  );
};