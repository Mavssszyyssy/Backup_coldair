import React, { useState } from 'react';
import './styles.css';

const AssignTask = ({ technician }) => {
  const [task, setTask] = useState('');
  const [result, setResult] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!technician || !task.trim()) return;
    setResult(`Task "${task}" assigned to ${technician.name}.`);
    setTask('');
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h3>Assign Task</h3>
      {technician ? <p>Selected: {technician.name}</p> : <p>Select a technician first.</p>}
      <input
        maxLength={1000}
        value={task}
        onChange={(event) => setTask(event.target.value)}
        placeholder="Task description"
      />
      <button type="submit" disabled={!technician}>Assign</button>
      {result && <p>{result}</p>}
    </form>
  );
};

export default AssignTask;
