import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  id,
  type,
  ...props
}) => {
  const baseInputClasses = `
    w-full px-3 py-2 border rounded-lg shadow-sm transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400
    dark:focus:ring-blue-400 dark:focus:border-blue-400
    ${error ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'}
  `;

  const dateInputClasses = type === 'date' ? `
    dark:[color-scheme:dark]
    [color-scheme:light]
  ` : '';

  const inputClasses = `${baseInputClasses} ${dateInputClasses} ${className}`;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={inputClasses}
        {...props}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};