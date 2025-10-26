import React, { useRef, useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
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
    Type,
    RotateCcw
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    checkboxStates?: Record<string, boolean>;
}

const TOOLBAR_BUTTON_COLORS = {
    bold: 'hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    italic: 'hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    underline: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
    alignLeft: 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400',
    alignCenter: 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400',
    alignRight: 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400',
    list: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    orderedList: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    checklist: 'hover:bg-pink-100 dark:hover:bg-pink-900/30 text-pink-600 dark:text-pink-400',
    color: 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400',
    reset: 'hover:bg-slate-100 dark:hover:bg-slate-900/30 text-slate-600 dark:text-slate-400',
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Enter text...',
    minHeight = '120px',
    checkboxStates = {}
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
    const [selectedColor, setSelectedColor] = useState("#000000");

    useEffect(() => {
        if (showColorPicker) {
            setIsColorPickerVisible(true);
        } else {
            const timer = setTimeout(() => {
                setIsColorPickerVisible(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [showColorPicker]);

    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || '';

            const checkboxes = editorRef.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-checkbox-id]');
            checkboxes.forEach(checkbox => {
                const id = checkbox.getAttribute('data-checkbox-id');
                if (id && checkboxStates[id] !== undefined) {
                    checkbox.checked = checkboxStates[id];
                }
            });
        }
    }, [value, checkboxStates]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const selection = window.getSelection();
        if (!selection || !editorRef.current) return;

        if (e.key === "Enter") {
            const range = selection.getRangeAt(0);
            const currentNode = range.startContainer;

            let checklistDiv = currentNode.nodeType === Node.TEXT_NODE
                ? currentNode.parentElement
                : currentNode as HTMLElement;

            while (checklistDiv && checklistDiv !== editorRef.current) {
                if (checklistDiv.classList?.contains('checklist-item')) {
                    e.preventDefault();

                    const checkboxId = `checkbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const newCheckList = document.createElement('div');
                    newCheckList.className = 'checklist-item flex items-start gap-2 my-1';
                    newCheckList.innerHTML = `
                        <input type="checkbox" class="mt-1 rounded" data-checkbox-id="${checkboxId}" />
                        <span contenteditable="true" class="flex-1"></span>
                    `;

                    checklistDiv.insertAdjacentElement('afterend', newCheckList);

                    const newSpan = newCheckList.querySelector('span');
                    if (newSpan) {
                        const newRange = document.createRange();
                        newRange.setStart(newSpan, 0);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }

                    handleInput();
                    return;
                }
                checklistDiv = checklistDiv.parentElement;
            }
        }
    };

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

        const checkboxId = `checkbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const checkList = document.createElement('div');
        checkList.className = 'checklist-item flex items-start gap-2 my-1'
        checkList.innerHTML = `
            <input type="checkbox" class="mt-1 rounded" data-checkbox-id="${checkboxId}" />
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

    const resetFormatting = () => {
        executeCommand('removeFormat');
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
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
            <div className="flex flex-wrap gap-[3px] p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 overflow-visible">
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
                        className={`p-2 rounded transition-colors ${TOOLBAR_BUTTON_COLORS.color} flex items-center gap-1`}
                    >
                        <Type className="w-4 h-4" />
                        <div
                            className="w-4 h-4 rounded border border-gray-400 dark:border-gray-500"
                            style={{ backgroundColor: selectedColor }}
                        />
                    </button>

                    {isColorPickerVisible && (
                        <div 
                            className={`absolute top-full right-[-2.5rem] mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-b-lg shadow-xl z-[100] animate-in ${
                                showColorPicker 
                                    ? 'fade-in-slow' 
                                    : 'fade-out-slow'
                            }`}
                        >
                            <HexColorPicker
                                color={selectedColor}
                                onChange={(color) => {
                                    setSelectedColor(color);
                                    executeCommand('foreColor', color);
                                }}
                                style={{ width: '180px', height: '150px' }}
                            />
                            <div className="mt-3 flex items-center justify-center gap-2">
                                <input
                                    type="text"
                                    value={selectedColor}
                                    onChange={(e) => {
                                        const color = e.target.value;
                                        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                                            setSelectedColor(color);
                                            executeCommand('foreColor', color);
                                        }
                                    }}
                                    className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                    placeholder="#000000"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowColorPicker(false)}
                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <ToolbarButton
                    onClick={resetFormatting}
                    icon={<RotateCcw className="w-4 h-4" />}
                    title="Reset Formatting"
                    colorClass={TOOLBAR_BUTTON_COLORS.reset}
                />
            </div>

            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onKeyDown={handleKeyDown}
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
                [contenteditable] ul,
                [contenteditable] ol {
                    padding-left: 2.5rem !important;
                    margin: 0.5rem 0 !important;
                    list-style-position: outside !important;
                }
                [contenteditable] ul {
                    list-style-type: disc !important;
                }
                [contenteditable] ol {
                    list-style-type: decimal !important;
                }
                [contenteditable] li {
                    margin: 0.25rem 0 !important;
                    display: list-item !important;
                    margin-left: 0 !important;
                }
                [contenteditable] ul li {
                    list-style-type: disc !important;
                }
                [contenteditable] ol li {
                    list-style-type: decimal !important;
                }
                [contenteditable] input[type="checkbox"] {
                    cursor: pointer;
                }
                .react-colorful {
                    gap: 12px;
                }
                .react-colorful__saturation,
                .react-colorful__interactive {
                    border: none;
                }
                .react-colorful__saturation-pointer,
                .react-colorful__hue-pointer {
                    width: 14px !important;
                    height: 14px !important;
                }
                .react-colorful__last-control {
                    height: 14px;
                    border-radius: 0 0 8px 8px;
                }
            `}</style>
        </div>
    );
};