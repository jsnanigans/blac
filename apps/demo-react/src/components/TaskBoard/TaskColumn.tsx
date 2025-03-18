import { useBloc } from '@blac/react';
import { Task, TaskBoardBloc, TaskStatus } from './TaskBoardBloc';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
    status: TaskStatus;
}

const columnColors = {
    todo: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    'in-progress': 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    done: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
};

const columnGradients = {
    todo: 'from-blue-500 to-blue-600',
    'in-progress': 'from-yellow-500 to-yellow-600',
    done: 'from-green-500 to-green-600',
};

const columnIcons = {
    todo: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
    ),
    'in-progress': (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    done: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
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
            className={`flex-1 rounded-xl border shadow-md transition-all duration-300 ease-in-out ${columnColors[status]} hover:shadow-lg`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className={`bg-gradient-to-r ${columnGradients[status]} px-4 py-3 rounded-t-xl`}>
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg text-white flex items-center">
                        {columnIcons[status]}
                        {title}
                    </h2>
                    <div className="bg-white/20 text-white font-medium px-2.5 py-0.5 rounded-full text-sm backdrop-blur-sm">
                        {tasks.length}
                    </div>
                </div>
            </div>

            <div className="p-4 h-[calc(100%-60px)] overflow-y-auto">
                {tasks.length === 0 ? (
                    <div className="py-8 px-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md h-32 flex items-center justify-center">
                        <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
                            <svg className="w-8 h-8 mb-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm">Drop tasks here</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map((task, index) => (
                            <div key={task.id} className="transform transition-all duration-200 ease-in-out" style={{ 
                                animationName: 'fadeIn', 
                                animationDuration: '0.5s',
                                animationFillMode: 'both',
                                animationDelay: `${index * 0.05}s`
                            }}>
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