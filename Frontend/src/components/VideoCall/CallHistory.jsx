import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaVideo, FaPhone, FaClock, FaCalendarAlt } from 'react-icons/fa';
import { MdCallMade, MdCallReceived, MdCallMissed } from 'react-icons/md';

const CallHistory = ({ isOpen, onClose }) => {
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, video, audio, missed
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  });

  useEffect(() => {
    if (isOpen) {
      fetchCallHistory();
    }
  }, [isOpen, filter]);

  const fetchCallHistory = async (page = 1) => {
    try {
      setLoading(true);
      const authData = JSON.parse(localStorage.getItem('auth-user'));
      const token = localStorage.getItem('jwt');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (filter !== 'all') {
        if (filter === 'missed') {
          params.append('status', 'declined');
        } else {
          params.append('callType', filter);
        }
      }

      const response = await axios.get(
        `http://localhost:4002/api/call/history?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setCallHistory(response.data.calls);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching call history:', error);
      toast.error('Failed to fetch call history');
    } finally {
      setLoading(false);
    }
  };

  const formatCallTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds || milliseconds === 0) return '0:00';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (call, currentUserId) => {
    const isOutgoing = call.participants[0]?.user._id === currentUserId;
    
    if (call.status === 'declined') {
      return <MdCallMissed className="text-red-500" size={20} />;
    } else if (isOutgoing) {
      return <MdCallMade className="text-green-500" size={20} />;
    } else {
      return <MdCallReceived className="text-blue-500" size={20} />;
    }
  };

  const getCallTypeIcon = (callType) => {
    return callType === 'video' 
      ? <FaVideo className="text-blue-500" size={16} />
      : <FaPhone className="text-green-500" size={16} />;
  };

  if (!isOpen) return null;

  const authData = JSON.parse(localStorage.getItem('auth-user'));
  const currentUserId = authData?.user?._id;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-800">Call History</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex mt-4 space-x-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'video', label: 'Video' },
              { key: 'audio', label: 'Audio' },
              { key: 'missed', label: 'Missed' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : callHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaClock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No call history found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {callHistory.map((call) => {
                const otherParticipant = call.participants.find(p => p.user._id !== currentUserId);
                const participant = otherParticipant?.user;
                
                return (
                  <div
                    key={call._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getCallIcon(call, currentUserId)}
                        {getCallTypeIcon(call.callType)}
                      </div>
                      
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-gray-600">
                          {participant?.fullname?.[0] || '?'}
                        </span>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-800">
                          {participant?.fullname || 'Unknown'}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{formatCallTime(call.startTime)}</span>
                          {call.duration > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(call.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        call.status === 'ended' ? 'bg-green-100 text-green-800' :
                        call.status === 'declined' ? 'bg-red-100 text-red-800' :
                        call.status === 'failed' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(call.startTime).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && callHistory.length > 0 && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchCallHistory(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev}
                className={`px-4 py-2 rounded text-sm ${
                  pagination.hasPrev
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => fetchCallHistory(pagination.currentPage + 1)}
                disabled={!pagination.hasNext}
                className={`px-4 py-2 rounded text-sm ${
                  pagination.hasNext
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallHistory;
