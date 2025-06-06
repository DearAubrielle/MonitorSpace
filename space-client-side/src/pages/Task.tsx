type Task = {
  task_id: number;
  description: string;
};
const tasks: Task[] = [
  {
    task_id: 1,
    description:
      'ปุ่มเพิ่มfloorplan กดแล้ว pop up ขึ้นมาให้ +input 1.floorplan_name 2.description และ +upload รูปภาพ',
  },
  {
    task_id: 2,
    description:
      'มีปุ่มให้กดแสดงรายการiot device ในรายการมีปุ่มให้กดเพิ่มdevice ลงใน floorplan ',
  },
  { task_id: 3, description: 'Task 3' },
  { task_id: 4, description: 'Task 4' },
];
export default function Task() {
  return (
    <div>
      <h1>Task Page</h1>
      <p>This is the task page where you can manage tasks.</p>
      <ul>
        <li>Task 1: Implement the task management system.</li>
        <li>Task 2: Integrate with the backend API.</li>
        <li>Task 3: Create a user-friendly interface.</li>
        <li>Task 4: Test the application thoroughly.</li>
      </ul>
      <div style={{ color: 'green' }}>
        <h2>งาน</h2>
        <ul>
          {tasks.map((task) => (
            <li key={task.task_id}>{task.description}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
