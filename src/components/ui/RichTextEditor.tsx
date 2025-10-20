import React, { useRef, useEffect, useState } from "react";
import {
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    CheckSquare,
    Type
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

const COLORS = [
  { label: 'Black', value: '#000000' },
  { label: 'Gray', value: '#6B7280' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Yellow', value: '#EAB308' },
  { label: 'Green', value: '#10B981' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#8B5CF6' },
];

const TOOLBAR_BUTTON_COLORS = {
    bold: 'hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    italic: 'hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    underline: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
    alignLeft: 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400',
    alignCenter: 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400',
    alignRight: 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400',
    list: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    orderedList: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    checklist: 'hover:bg-pink-100 dark:hover:bg-pink-900/30 text-pink-600 dark:text-pink-400',
    color: 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400',
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Enter text...',
    minHeight = '120px'
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const executeCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleInput();
    };

    const insertChecklist = () => {
        const selection = window.getSelection();
        if (!selection || !editorRef.current) return;

        const checkList = document.createElement('div');
        checkList.className = 'flex items-start gap-2 my-1'
        checkList.innerHTML = `
            <input type="checkbox" class="mt-1 rounded" />
            <span contenteditable="true" class="flex-1">Checklist item</span>
        `;

        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(checkList);
            range.setStartAfter(checkList);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        handleInput();
    };

    const ToolbarButton: React.FC<{
        onClick: () => void;
        icon: React.ReactNode;
        title: string;
        colorClass?: string;
    }> = ({ onClick, icon, title, colorClass = '' }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-2 rounded transition-colors ${colorClass}`}
        >
            {icon}
        </button>
    );

    return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
            <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <ToolbarButton
                    onClick={() => executeCommand('bold')}
                    icon={<Bold className="w-4 h-4" />}
                    title="Bold"
                    colorClass={TOOLBAR_BUTTON_COLORS.bold}
                />
                <ToolbarButton
                    onClick={() => executeCommand('italic')}
                    icon={<Italic className="w-4 h-4" />}
                    title="Italic"
                    colorClass={TOOLBAR_BUTTON_COLORS.italic}
                />
                <ToolbarButton
                    onClick={() => executeCommand('underline')}
                    icon={<Underline className="w-4 h-4" />}
                    title="Underline"
                    colorClass={TOOLBAR_BUTTON_COLORS.underline}
                />

                <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />

                <ToolbarButton
                    onClick={() => executeCommand('justifyLeft')}
                    icon={<AlignLeft className="w-4 h-4" />}
                    title="Align Left"
                    colorClass={TOOLBAR_BUTTON_COLORS.alignLeft}
                />
                <ToolbarButton
                    onClick={() => executeCommand('justifyCenter')}
                    icon={<AlignCenter className="w-4 h-4" />}
                    title="Align Center"
                    colorClass={TOOLBAR_BUTTON_COLORS.alignCenter}
                />
                <ToolbarButton
                    onClick={() => executeCommand('justifyRight')}
                    icon={<AlignRight className="w-4 h-4" />}
                    title="Align Right"
                    colorClass={TOOLBAR_BUTTON_COLORS.alignRight}
                />

                <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />

                <ToolbarButton
                    onClick={() => executeCommand('insertUnorderedList')}
                    icon={<List className="w-4 h-4" />}
                    title="Bullet List"
                    colorClass={TOOLBAR_BUTTON_COLORS.list}
                />
                <ToolbarButton
                    onClick={() => executeCommand('insertOrderedList')}
                    icon={<ListOrdered className="w-4 h-4" />}
                    title="Numbered List"
                    colorClass={TOOLBAR_BUTTON_COLORS.orderedList}
                />
                <ToolbarButton
                    onClick={insertChecklist}
                    icon={<CheckSquare className="w-4 h-4" />}
                    title="Checklist"
                    colorClass={TOOLBAR_BUTTON_COLORS.checklist}
                />

                <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1" />

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        title="Text Color"
                        className={`p-2 rounded transition-colors ${TOOLBAR_BUTTON_COLORS.color}`}
                    >
                        <Type className="w-4 h-4" />
                    </button>

                    {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 flex flex-wrap gap-1 w-48">
                            {COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => {
                                        executeCommand('foreColor', color.value);
                                        setShowColorPicker(false);
                                    }}
                                    title={color.label}
                                    className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color.value }}
                                />
                            ))}
                        </div>   
                    )}
                </div>
            </div>

            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="p-3 focus:outline-none text-gray-900 dark:text-white overflow-y-auto"
                style={{ minHeight }}
                data-placeholder={placeholder}
            />

            <style>{`
                [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: #9CA3AF;
                    pointer-events: none;
                    display: block;
                }
                [contenteditable]:ul,
                [contenteditable]:ol {
                    paddint-left: 1.5rem;
                    margin: 0.5rem 0;
                }
                [contenteditable] li {
                    margin: 0.25rem 0;
                }
                [contenteditable] input[type="checkbox"] {
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};