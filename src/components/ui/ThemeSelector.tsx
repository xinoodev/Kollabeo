import React from "react";
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from "../../contexts/ThemeContext";

interface ThemeSelectorProps {
    showLabels?: boolean;
    size?: 'sm' | 'md';
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
    showLabels = true,
    size = 'md'
}) => {
    const { theme, setTheme } = useTheme();

    const themes = [
        { value: 'light' as const, label: 'Light', icon: Sun },
        { value: 'dark' as const, label: 'Dark', icon: Moon },
        { value: 'system' as const, label: 'System', icon: Monitor },
    ];

    const buttonSize = size === 'sm' ? 'p-2' : 'p-3';
    const iconsSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

    return (
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {themes.map(({ value, label, icon: Icon }) => (
               <button
                key={value}
                onClick={() => setTheme(value)}
                className={`
                    ${buttonSize} rounded-md transition-all duration-200 flex items-center space-x-2
                    ${theme === value
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                    }
                `}
                title={label}
               >
                <Icon className={iconsSize} />
                {showLabels && (
                    <span className="text-sm font-medium">{label}</span>
                )}
               </button> 
            ))}
        </div>
    );
};