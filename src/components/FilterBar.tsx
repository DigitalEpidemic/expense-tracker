import React from 'react';
import { Filter } from 'lucide-react';

interface FilterBarProps {
  filter: 'all' | 'reimbursed' | 'pending';
  onFilterChange: (filter: 'all' | 'reimbursed' | 'pending') => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filter, onFilterChange }) => {
  const filters = [
    { key: 'all', label: 'All Expenses' },
    { key: 'pending', label: 'Pending' },
    { key: 'reimbursed', label: 'Reimbursed' },
  ] as const;

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3">
      <Filter className="w-5 h-5 text-gray-400" />
      <div className="flex gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
              filter === key
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterBar;