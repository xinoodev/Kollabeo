import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageSelectorProps {
  showLabels?: boolean;
  size?: 'sm' | 'md';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ showLabels = true, size = 'md' }) => {
  const { lang, setLang, t } = useLanguage();

  const selectClass = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className="mt-2">
      <label className="sr-only">{t('language.label')}</label>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as 'en' | 'es')}
        className={`w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-2 ${selectClass}`}
      >
        <option value="en">{t('language.english')}</option>
        <option value="es">{t('language.spanish')}</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
