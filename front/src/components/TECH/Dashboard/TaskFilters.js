import React from 'react';
import './styles.css';

const TaskFilters = ({ filter, setFilter }) => (
  <div className="tech-task-filters">
    <label className="tech-task-filter-label" htmlFor="tech-task-filter">
      Filter
    </label>
    <select
      id="tech-task-filter"
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      className="tech-task-filter-select"
    >
      <option value="all">All</option>
      <option value="processing">Processing</option>
      <option value="in-progress">In Progress</option>
      <option value="on-hold">On Hold</option>
      <option value="completed">Completed</option>
    </select>
  </div>
);

export default TaskFilters;
