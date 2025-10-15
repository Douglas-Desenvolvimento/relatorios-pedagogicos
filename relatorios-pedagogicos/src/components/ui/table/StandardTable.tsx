// components/ui/table/StandardTable.tsx
import React from 'react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface StandardTableProps {
  columns: Column[];
  data: any[];
  keyField?: string;
  onRowClick?: (row: any) => void;
  className?: string;
  emptyMessage?: string;
}

export default function StandardTable({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  className = '',
  emptyMessage = 'Nenhum dado disponível'
}: StandardTableProps) {
  const getAlignment = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 ${getAlignment(col.align)}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.length > 0 ? (
            data.map((row) => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' : ''}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${getAlignment(col.align)} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
