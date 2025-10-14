import React, { useState, useEffect } from "react";
import { TaskComment } from '../../types'
import { apiClient } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/Button";
import { MessageSquare, Send, Trash2, Edit2, X } from "lucide-react";
import { format } from "date-fns";

interface TaskCommentsProps {
    taskId: number;
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId }) => {
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        loadComments();
    }, [taskId]);

    const loadComments = async () => {
        try {
            const data = await apiClient.getComments(taskId);
            setComments(data);
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setLoading(true);
        try {
            await apiClient.createComment(taskId, newComment);
            setNewComment('');
            await loadComments();
        } catch (error) {
            console.error('Error creating comment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (comment: TaskComment) => {
        setEditingCommentId(comment.id);
        setEditContent(comment.content);
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditContent('');
    };

    const handleUpdateComment = async (commentId: number) => {
        if (!editContent.trim()) return;

        setLoading(true);
        try {
            await apiClient.updateComment(commentId, editContent);
            setEditingCommentId(null);
            setEditContent('');
            await loadComments();
        } catch (error) {
            console.error('Error updating comment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (commentId: number) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            await apiClient.deleteComment(commentId);
            await loadComments();
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    return (
        <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
                Comments ({comments.length})
            </h4>

            <form onSubmit={handleSubmit} className="space-y-2">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                    rows={3}
                    disabled={loading}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={loading || !newComment.trim()} size="sm">
                        <Send className="w-4 h-4 mr-1" />
                        {loading ? 'Sending...' : 'Comment'}
                    </Button>
                </div>
            </form>

            <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No comments yet. Be the first to comment!
                    </p>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                            {comment.username?.charAt(0).toUpperCase() || comment.full_name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {comment.username || comment.full_name || 'Unknown User'}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {format(new Date(comment.created_at), 'PPp')}
                                        </p>
                                    </div>
                                </div>
                                {user && comment.user_id === user.id && (
                                    <div className="flex items-center space-x-1">
                                        {editingCommentId !== comment.id && (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(comment)}
                                                    className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(comment.id)}
                                                    className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {editingCommentId === comment.id ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                        rows={3}
                                        disabled={loading}
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleCancelEdit}
                                            disabled={loading}
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleUpdateComment(comment.id)}
                                            disabled={loading || !editContent.trim()}
                                        >
                                            <Send className="w-4 h-4 mr-1" />
                                            Update
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {comment.content}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};