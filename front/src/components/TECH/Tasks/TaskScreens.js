import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TechLayout from '../Common/TechLayout';
import TaskCard from '../Dashboard/TaskCard';
import { apiRequest } from '../../../config/api';
import '../techShared.css';
import './styles.css';

const TaskScreens = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    apiRequest('/dashboard/me')
      .then((data) => setTasks(data.tasks || []))
      .catch(() => setTasks([]));
  }, []);

  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const pageTasks = useMemo(
    () => tasks.slice((page - 1) * pageSize, page * pageSize),
    [page, tasks],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <TechLayout title="Task Board" subtitle="Manage your assigned jobs">
      <div className="tech-card">
        <h3>All Tasks <span className="task-screen-count">{tasks.length}</span></h3>
        {pageTasks.map((task) => (
          <TaskCard
            key={task.id || task.taskCode}
            task={task}
            onView={(selectedTask) => navigate(`/tech/tasks/${selectedTask.taskCode || selectedTask.id}`)}
          />
        ))}
        {!tasks.length ? <p className="task-screen-empty-text">No assigned tasks yet.</p> : null}
        {tasks.length > pageSize ? (
          <div className="task-screen-pagination" aria-label="Task pagination">
            <button type="button" className="pagination-btn pagination-btn--wide" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" className="pagination-btn pagination-btn--wide" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
          </div>
        ) : null}
      </div>
    </TechLayout>
  );
};

export default TaskScreens;
