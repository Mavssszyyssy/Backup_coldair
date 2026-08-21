import React, { useEffect, useState } from 'react';
import { useUser } from '../../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../../config/api';
import { getSessionActiveBranch } from '../../../utils/authSession';
import TechLayout from '../Common/TechLayout';
import TaskCard from './TaskCard';
import TaskFilters from './TaskFilters';
import TechDispatchMetrics from './TechDispatchMetrics';
import '../techShared.css';
import './styles.css';

const TechMainScreen = () => {
  const { user } = useUser();
  const activeBranch = getSessionActiveBranch() || user?.activeBranch || '';
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    processingTasks: 0,
    inProgressTasks: 0,
    completedToday: 0,
    totalTasks: 0
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    apiRequest('/dashboard/me')
      .then((data) => {
        setTasks(data.tasks || []);
        setStats({
          processingTasks: data?.stats?.processingTasks || 0,
          inProgressTasks: data?.stats?.inProgressTasks || 0,
          completedToday: data?.stats?.completedToday || 0,
          totalTasks: data?.stats?.totalTasks || 0
        });
      })
      .catch((error) => {
        console.error('Failed to load technician dashboard:', error);
        setTasks([]);
      });
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter((task) => task.status === filter);

  return (
    <TechLayout title="Technician Dashboard" subtitle={activeBranch ? `${activeBranch} branch workspace` : (user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Technician workspace')}>
      <TechDispatchMetrics tasks={tasks} />
      <p className="tech-dispatch-note">
        New jobs are auto-assigned by availability and workload balancing when the dispatcher API is connected; tickets capture visit history, warranty flags, and return visits.
      </p>
      <div className="tech-stats-grid">
        <div className="tech-stat-card">
          <h3>Processing Tasks</h3>
          <p>{stats.processingTasks}</p>
        </div>
        <div className="tech-stat-card">
          <h3>In Progress</h3>
          <p>{stats.inProgressTasks}</p>
        </div>
        <div className="tech-stat-card">
          <h3>Completed Today</h3>
          <p>{stats.completedToday}</p>
        </div>
        <div className="tech-stat-card">
          <h3>Total Tasks</h3>
          <p>{stats.totalTasks}</p>
        </div>
      </div>

      <div className="tech-card tech-assigned-tasks-card">
        <div className="tech-assigned-tasks-header">
          <h3>My Assigned Tasks</h3>
          <TaskFilters filter={filter} setFilter={setFilter} />
        </div>
        <div className="tech-assigned-tasks-list">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onView={(selectedTask) => navigate(`/tech/tasks/${selectedTask.taskCode || selectedTask.id}`)}
            />
          ))}
        </div>
      </div>

      <div className="tech-card">
        <h3>Technician Notes</h3>
        <div>
          <p><strong>Daily Goal:</strong> Complete at least 3 tasks with customer confirmation.</p>
          <p><strong>Safety Reminder:</strong> Follow lockout-tagout checks before electrical servicing.</p>
          <p><strong>Escalation:</strong> Report high-risk jobs to admin dispatcher immediately.</p>
        </div>
      </div>
    </TechLayout>
  );
};

export default TechMainScreen;
