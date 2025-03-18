import { useBloc } from '@blac/react';
import { Task, TaskBoardBloc, TaskStatus } from './TaskBoardBloc';
import { TaskCard } from './TaskCard';
import { useMemo } from 'react';

interface TaskColumnProps {
    status: TaskStatus;
}

const columnColors = {
    todo: 'bg-blue-50 dark:bg-blue-900/20',
    'in-progress': 'bg-yellow-50 dark:bg-yellow-900/20',
    done: 'bg-green-50 dark:bg-green-900/20',
};

const columnHeaders = {
    todo: 'To Do',
    'in-progress': 'In Progress',
    done: 'Done',
};

export function TaskColumn({
    status,
}: TaskColumnProps) {
    const title = columnHeaders[status];
    const [, taskBoardBloc] = useBloc(TaskBoardBloc);

    let tasks = [];
    if (status === 'todo') {
        tasks = taskBoardBloc.todoTasks;
    } else if (status === 'in-progress') {
        tasks = taskBoardBloc.inProgressTasks;
    } else {
        tasks = taskBoardBloc.doneTasks;
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        taskBoardBloc.updateTaskStatus(taskId, status);
    };

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.setData('taskId', task.id);
    };

    return (
        <div
            className={`flex-1 p-4 rounded-lg min-w-[250px] ${columnColors[status]}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg text-gray-800 dark:text-white">
                    {title}
                </h2>
                <div className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium px-2.5 py-0.5 rounded-full text-sm">
                    {tasks.length}
                </div>
            </div>

            <div className="h-full overflow-y-auto">
                {tasks.length === 0 ? (
                    <div className="py-8 px-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Drag tasks here
                        </p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onStatusChange={taskBoardBloc.updateTaskStatus}
                            onPriorityChange={taskBoardBloc.updateTaskPriority}
                            onDelete={taskBoardBloc.deleteTask}
                            onDragStart={handleDragStart}
                        />
                    ))
                )}
            </div>
        </div>
    );
} 