import React, { useState, useEffect } from "react";
import { TaskComment } from '../../types'
import { apiClient } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/Button";
import { MessageSquare, Send, Trash2, Edit2, X, Reply } from "lucide-react";
import { format } from "date-fns";

interface TaskCommentsProps {
    taskId: number;
    onCommentAdded?: () => void;
}

interface CommentItemProps {
    comment: TaskComment;
    onReply: (commentId: number) => void;
    onEdit: (comment: TaskComment) => void;
    onDelete: (commentId: number) => void;
    currentUserId?: number;
    level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    onReply,
    onEdit,
    onDelete,
    currentUserId,
    level = 0
}) => {
    const isOwner = currentUserId === comment.user_id;
    const initials = comment.username?.charAt(0).toUpperCase() ||
                     comment.full_name?.charAt(0).toUpperCase() || '?';
    const displayName = comment.username || comment.full_name || 'Unknown User';

    return (
        <div className={`space-y-2 ${level > 0 ? 'ml-8 mt-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {comment.avatar_url ? (
                            <img
                                src={comment.avatar_url}
                                alt={displayName}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                    {initials}
                                </span>
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {displayName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {format(new Date(comment.created_at), 'PPp')}
                            </p>
                        </div>
                    </div>
                    {isOwner && (
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => onEdit(comment)}
                                className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                title="Edit"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onDelete(comment.id)}
                                className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comment.content}
                </p>

                {level < 3 && (
                    <button
                        onClick={() => onReply(comment.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                        <Reply className="w-3 h-3" />
                        Reply
                    </button>
                )}
            </div>

            {comment.replies && comment.replies.length > 0 && (
                <div className="space-y-2">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            currentUserId={currentUserId}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, onCommentAdded }) => {
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        loadComments();
    }, [taskId]);

    const organizeComments = (flatComments: TaskComment[]): TaskComment[] => {
        const commentMap = new Map<number, TaskComment>();
        const rootComments: TaskComment[] = [];

        flatComments.forEach(comment => {
            commentMap.set(comment.id, { ...comment, replies: [] });
        });

        flatComments.forEach(comment => {
            const commentWithReplies = commentMap.get(comment.id)!;
            if (comment.parent_id) {
                const parent = commentMap.get(comment.parent_id);
                if (parent) {
                    parent.replies = parent.replies || [];
                    parent.replies.push(commentWithReplies);
                }
            } else {
                rootComments.push(commentWithReplies);
            }
        });

        return rootComments;
    };

    const loadComments = async () => {
        try {
            const data = await apiClient.getComments(taskId);
            const organized = organizeComments(data);
            setComments(organized);
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

            if (onCommentAdded) {
                onCommentAdded();
            }
        } catch (error) {
            console.error('Error creating comment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReplySubmit = async (parentId: number) => {
        if (!replyContent.trim()) return;

        setLoading(true);
        try {
            await apiClient.createComment(taskId, replyContent, parentId);
            setReplyContent('');
            setReplyingTo(null);
            await loadComments();
        } catch (error) {
            console.error('Error creating reply:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (comment: TaskComment) => {
        setEditingCommentId(comment.id);
        setEditContent(comment.content);
        setReplyingTo(null);
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

            if (onCommentAdded) {
                onCommentAdded();
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    const handleReply = (commentId: number) => {
        setReplyingTo(commentId);
        setEditingCommentId(null);
    };

    const getTotalCommentCount = (comments: TaskComment[]): number => {
        return comments.reduce((count, comment) => {
            return count + 1 + (comment.replies ? getTotalCommentCount(comment.replies) : 0);
        }, 0);
    };

    const renderEditForm = (comment: TaskComment) => {
        if (editingCommentId !== comment.id) return null;

        return (
            <div className="mt-2 space-y-2">
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
        );
    };

    const renderReplyForm = (commentId: number) => {
        if (replyingTo !== commentId) return null;

        return (
            <div className="ml-8 mt-2 space-y-2 border-l-2 border-blue-300 dark:border-blue-700 pl-4">
                <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                    rows={2}
                    disabled={loading}
                    autoFocus
                />
                <div className="flex justify-end space-x-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                        }}
                        disabled={loading}
                    >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => handleReplySubmit(commentId)}
                        disabled={loading || !replyContent.trim()}
                    >
                        <Send className="w-4 h-4 mr-1" />
                        Reply
                    </Button>
                </div>
            </div>
        );
    };

    const renderCommentWithForms = (comment: TaskComment) => {
        return (
            <div key={comment.id} className="space-y-2">
                {editingCommentId === comment.id ? (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center space-x-2">
                            {comment.avatar_url ? (
                                <img
                                    src={comment.avatar_url}
                                    alt={comment.username || comment.full_name || 'User'}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                        {comment.username?.charAt(0).toUpperCase() || comment.full_name?.charAt(0).toUpperCase() || '?'}
                                    </span>
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {comment.username || comment.full_name || 'Unknown User'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {format(new Date(comment.created_at), 'PPp')}
                                </p>
                            </div>
                        </div>
                        {renderEditForm(comment)}
                    </div>
                ) : (
                    <>
                        <CommentItem
                            comment={comment}
                            onReply={handleReply}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            currentUserId={user?.id}
                        />
                        {renderReplyForm(comment.id)}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
                Comments ({getTotalCommentCount(comments)})
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
                    comments.map(renderCommentWithForms)
                )}
            </div>
        </div>
    );
};