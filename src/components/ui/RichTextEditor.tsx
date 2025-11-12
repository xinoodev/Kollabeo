import React, { useRef, useEffect, useState, useCallback } from "react";
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
    RotateCcw,
    Image,
    Link as LinkIcon
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
    image: 'hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    link: 'hover:bg-teal-100 dark:hover:bg-teal-900/30 text-teal-600 dark:text-teal-400',
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
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [imageAlt, setImageAlt] = useState("");
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [selectedText, setSelectedText] = useState("");
    const savedRangeRef = useRef<Range | null>(null);

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

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const handleImageResize = useCallback((e: Event) => {
        const slider = e.target as HTMLInputElement;
        const imageId = slider.getAttribute('data-image-id');
        if (!imageId || !editorRef.current) return;

        const percentage = parseInt(slider.value);
        const img = editorRef.current.querySelector(`img[data-image-id="${imageId}"]`) as HTMLImageElement;
        const sizeLabel = editorRef.current.querySelector(`span[data-image-id="${imageId}"].image-size-label`) as HTMLSpanElement;

        if (img) {
            img.style.maxWidth = `${percentage}%`;
        }

        if (sizeLabel) {
            sizeLabel.textContent = `${percentage}%`;
        }

        handleInput();
    }, [handleInput]);

    const handleImageDelete = useCallback((e: Event) => {
        const button = e.target as HTMLElement;
        const imageId = button.closest('[data-delete-image-id]')?.getAttribute('data-delete-image-id');
        if (!imageId || !editorRef.current) return;

        const wrapper = editorRef.current.querySelector(`.image-wrapper[data-image-id="${imageId}"]`);
        if (wrapper) {
            wrapper.remove();
            handleInput();
        }
    }, [handleInput]);

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

            // Re-attach event listeners to image size sliders
            const sliders = editorRef.current.querySelectorAll<HTMLInputElement>('.image-size-slider');
            sliders.forEach(slider => {
                slider.removeEventListener('input', handleImageResize);
                slider.addEventListener('input', handleImageResize);
            });

            // Re-attach event listeners to delete buttons
            const deleteButtons = editorRef.current.querySelectorAll('.image-delete-button');
            deleteButtons.forEach(button => {
                button.removeEventListener('click', handleImageDelete);
                button.addEventListener('click', handleImageDelete);
            });
        }
    }, [value, checkboxStates, handleImageResize, handleImageDelete]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const selection = window.getSelection();
        if (!selection || !editorRef.current) return;

        if (e.key === "Backspace" || e.key === "Delete") {
            const range = selection.getRangeAt(0);
            const selectedContent = range.cloneContents();
            const imageWrapper = selectedContent.querySelector('.image-wrapper');

            if (imageWrapper) {
                e.preventDefault();
                return;
            }

            if (range.collapsed) {
                const node = range.startContainer;
                const parent = node.parentElement;

                if (parent?.classList?.contains('image-wrapper')) {
                    e.preventDefault();
                    return;
                }

                if (e.key === "Backspace" && node.previousSibling) {
                    const prevSibling = node.previousSibling;
                    if (prevSibling.nodeType === Node.ELEMENT_NODE && (prevSibling as HTMLElement).classList?.contains('image-wrapper')) {
                        e.preventDefault();
                        return;
                    }
                }

                if (e.key === "Delete" && node.nextSibling) {
                    const nextSibling = node.nextSibling;
                    if (nextSibling.nodeType === Node.ELEMENT_NODE && (nextSibling as HTMLElement).classList?.contains('image-wrapper')) {
                        e.preventDefault();
                        return;
                    }
                }
            }
        }

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

    const insertImage = () => {
        if (!imageUrl.trim() || !editorRef.current) return;

        editorRef.current.focus();

        let range: Range;
        const selection = window.getSelection();
        
        if (savedRangeRef.current) {
            range = savedRangeRef.current;
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } else if (selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        } else {
            range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }

        const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.setAttribute('data-image-id', imageId);
        wrapper.setAttribute('contenteditable', 'false');
        wrapper.style.cssText = 'margin: 0.5rem 0; user-select: none;';

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        imageContainer.setAttribute('contenteditable', 'false');
        imageContainer.style.cssText = 'margin-bottom: 0.5rem;';

        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = imageAlt || 'Image';
        img.setAttribute('data-image-id', imageId);
        img.setAttribute('contenteditable', 'false');
        img.className = 'editor-image';
        img.style.cssText = 'max-width: 100%; height: auto; display: block; border-radius: 0.375rem; max-height: 400px; object-fit: contain; width: 100%; pointer-events: none;';

        imageContainer.appendChild(img);
        wrapper.appendChild(imageContainer);

        const sizeControl = document.createElement('div');
        sizeControl.className = 'image-size-control';
        sizeControl.setAttribute('contenteditable', 'false');
        sizeControl.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #f3f4f6; border-radius: 0.375rem; max-width: 300px; margin-top: 0.25rem; position: relative;';

        const label = document.createElement('span');
        label.textContent = 'Size:';
        label.style.cssText = 'font-size: 0.75rem; color: #6b7280; min-width: 30px; user-select: none;';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'image-size-slider';
        slider.setAttribute('data-image-id', imageId);
        slider.min = '50';
        slider.max = '100';
        slider.value = '100';
        slider.style.cssText = 'flex: 1; height: 4px; border-radius: 2px; background: #d1d5db; outline: none; accent-color: #3b82f6; cursor: pointer;';

        const sizeLabel = document.createElement('span');
        sizeLabel.className = 'image-size-label';
        sizeLabel.setAttribute('data-image-id', imageId);
        sizeLabel.textContent = '100%';
        sizeLabel.style.cssText = 'font-size: 0.75rem; color: #6b7280; min-width: 35px; text-align: right; user-select: none; pointer-events: none;';

        const deleteButton = document.createElement('button');
        deleteButton.className = 'image-delete-button';
        deleteButton.setAttribute('data-delete-image-id', imageId);
        deleteButton.setAttribute('type', 'button');
        deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        deleteButton.style.cssText = 'padding: 0.25rem; background: #ef4444; color: white; border: none; border-radius: 0.25rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;';
        deleteButton.onmouseover = () => deleteButton.style.background = '#dc2626';
        deleteButton.onmouseout = () => deleteButton.style.background = '#ef4444';

        sizeControl.appendChild(label);
        sizeControl.appendChild(slider);
        sizeControl.appendChild(sizeLabel);
        sizeControl.appendChild(deleteButton);
        wrapper.appendChild(sizeControl);

        const nextLine = document.createElement('div');
        nextLine.appendChild(document.createElement('br'));

        range.deleteContents();
        range.insertNode(wrapper);
        range.setStartAfter(wrapper);
        range.collapse(true);
        range.insertNode(nextLine);
        range.setStart(nextLine, 0);
        range.collapse(true);

        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        slider.addEventListener('input', handleImageResize);
        deleteButton.addEventListener('click', handleImageDelete);

        savedRangeRef.current = null;

        setImageUrl("");
        setImageAlt("");
        setShowImageModal(false);
        handleInput();
    };

    const resetFormatting = () => {
        executeCommand('removeFormat');
    };

    const insertLink = () => {
        if (!linkUrl.trim() || !editorRef.current) return;

        editorRef.current.focus();

        let range: Range;
        const selection = window.getSelection();

        if (savedRangeRef.current) {
            range = savedRangeRef.current;
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } else if (selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        } else {
            return;
        }

        const selectedContent = range.extractContents();
        const link = document.createElement('a');
        link.href = linkUrl;
        link.style.cssText = 'color: #0ea5e9; text-decoration: underline; cursor: pointer;';
        link.appendChild(selectedContent.cloneNode(true));

        range.insertNode(link);
        range.setStartAfter(link);
        range.collapse(true);

        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        savedRangeRef.current = null;
        setLinkUrl("");
        setSelectedText("");
        setShowLinkModal(false);
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

                <ToolbarButton
                    onClick={() => {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                            savedRangeRef.current = selection.getRangeAt(0).cloneRange();
                        }
                        setShowImageModal(true);
                    }}
                    icon={<Image className="w-4 h-4" />}
                    title="Insert Image"
                    colorClass={TOOLBAR_BUTTON_COLORS.image}
                />

                <ToolbarButton
                    onClick={() => {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            const text = range.toString();
                            if (text) {
                                setSelectedText(text);
                                savedRangeRef.current = range.cloneRange();
                                setShowLinkModal(true);
                            }
                        }
                    }}
                    icon={<LinkIcon className="w-4 h-4" />}
                    title="Insert Link"
                    colorClass={TOOLBAR_BUTTON_COLORS.link}
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

            {showImageModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Insert Image
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Image URL
                                </label>
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Alt Text (optional)
                                </label>
                                <input
                                    type="text"
                                    value={imageAlt}
                                    onChange={(e) => setImageAlt(e.target.value)}
                                    placeholder="Description of the image"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowImageModal(false);
                                        setImageUrl("");
                                        setImageAlt("");
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={insertImage}
                                    disabled={!imageUrl.trim()}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    Insert
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showLinkModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Insert Link
                        </h3>
                        <div className="space-y-4">
                            {selectedText && (
                                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Text to link:</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {selectedText}
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    URL
                                </label>
                                <input
                                    type="url"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                                    autoFocus
                                />
                            </div>
                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLinkModal(false);
                                        setLinkUrl("");
                                        setSelectedText("");
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={insertLink}
                                    disabled={!linkUrl.trim()}
                                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    Insert
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                [contenteditable] a {
                    color: #0ea5e9;
                    text-decoration: underline;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                [contenteditable] a:hover {
                    color: #06b6d4;
                }
                .dark [contenteditable] a {
                    color: #06b6d4;
                }
                .dark [contenteditable] a:hover {
                    color: #0ea5e9;
                }
                [contenteditable] img {
                    display: block;
                    max-width: 100%;
                    height: auto;
                    margin: 0.5rem 0;
                    border-radius: 0.375rem;
                }
                [contenteditable] .image-wrapper {
                    margin: 0.5rem 0;
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }
                [contenteditable] .image-wrapper * {
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }
                [contenteditable] .image-container {
                    margin-bottom: 0.5rem;
                }
                [contenteditable] .image-size-control {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    background: #f3f4f6;
                    border-radius: 0.375rem;
                    max-width: 300px;
                    margin-top: 0.25rem;
                }
                [contenteditable] .image-size-label {
                    pointer-events: none;
                    user-select: none;
                }
                [contenteditable] .image-delete-button {
                    flex-shrink: 0;
                }
                [contenteditable] .image-delete-button:hover {
                    background: #dc2626 !important;
                }
                .dark [contenteditable] .image-size-control {
                    background: #374151;
                }
                .dark [contenteditable] .image-size-control span {
                    color: #9ca3af;
                }
                [contenteditable] .image-size-slider {
                    flex: 1;
                    height: 4px;
                    border-radius: 2px;
                    background: #d1d5db;
                    outline: none;
                    accent-color: #3b82f6;
                    cursor: pointer;
                }
                [contenteditable] .image-size-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                [contenteditable] .image-size-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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