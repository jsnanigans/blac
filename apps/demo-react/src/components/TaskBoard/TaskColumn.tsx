import { useBloc } from '@blac/react';
import { Task, TaskBoardBloc, TaskStatus } from './TaskBoardBloc';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
    status: TaskStatus;
}

// Visual styles organized by status
const columnColors = {
    todo: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    'in-progress': 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    done: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
};

const columnHeaders = {
    todo: 'To Do',
    'in-progress': 'In Progress',
    done: 'Done',
};

export function TaskColumn({ status }: TaskColumnProps) {
    const title = columnHeaders[status];
    
    // Notice how we use only the bloc and not the state
    // This component doesn't need the entire state object
    // It only uses computed properties from the bloc itself
    const [, taskBoardBloc] = useBloc(TaskBoardBloc);

    // Access only the tasks for this column's status
    // This is a key Blac feature - components can directly access
    // computed properties from the bloc, which only recalculate when needed
    let tasks = [];
    if (status === 'todo') {
        tasks = taskBoardBloc.todoTasks;
    } else if (status === 'in-progress') {
        tasks = taskBoardBloc.inProgressTasks;
    } else {
        tasks = taskBoardBloc.doneTasks;
    }

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        
        // Call state update method directly on the bloc
        taskBoardBloc.updateTaskStatus(taskId, status);
    };

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.setData('taskId', task.id);
    };

    return (
        <div
            className={`rounded-lg border ${columnColors[status]}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="bg-gray-800 px-4 py-3 rounded-t-lg text-white">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">
                        {title}
                    </h2>
                    <div className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-sm">
                        {tasks.length}
                    </div>
                </div>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
                {tasks.length === 0 ? (
                    <div className="py-8 px-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md h-32 flex items-center justify-center">
                        <div className="text-gray-500 dark:text-gray-400">
                            <p className="text-sm">Drop tasks here</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map((task) => (
                            <div key={task.id}>
                                {/* Pass methods from the bloc to child components */}
                                <TaskCard
                                    task={task}
                                    onStatusChange={taskBoardBloc.updateTaskStatus}
                                    onPriorityChange={taskBoardBloc.updateTaskPriority}
                                    onDelete={taskBoardBloc.deleteTask}
                                    onDragStart={handleDragStart}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}