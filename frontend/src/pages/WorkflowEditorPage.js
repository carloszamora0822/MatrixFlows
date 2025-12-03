import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import WorkflowPage from './WorkflowPage';

const WorkflowEditorPage = () => {
  const { workflowId } = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const response = await fetch('/api/workflows', { credentials: 'include' });
        if (response.ok) {
          const workflows = await response.json();
          const found = workflows.find(w => w.workflowId === workflowId);
          setWorkflow(found);
        }
      } catch (error) {
        console.error('Failed to fetch workflow:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflow();
  }, [workflowId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600 font-semibold">Workflow not found</p>
        </div>
      </div>
    );
  }

  return <WorkflowPage mode="edit" initialWorkflow={workflow} />;
};

export default WorkflowEditorPage;
