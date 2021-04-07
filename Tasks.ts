import { DateTime, Duration } from "luxon";
import Store from "./Store";
import Utils from "./Utils";

export type TTask = {
    start: typeof DateTime;
    duration: typeof Duration;
    name: string;
    completedAt?: typeof DateTime;
    category?: number;
    squish: boolean;
    move: boolean;
    split: boolean;
    inProgress: boolean;
};

export const Tasks = {
    getFinishTime: (task: TTask) => {
        return task?.completedAt || task?.start.plus(task.duration);
    },
    getDuration: (task: TTask) => {
        return task?.completedAt
            ? task.completedAt.diff(task.start)
            : task.duration;
    },
    sortByStart: (tasks: TTask[]) => {
        return tasks.sort(
            (task1, task2) => task1.start.valueOf() - task2.start.valueOf()
        );
    },
    rearrange: (tasks: TTask[]) => {
        // we should re-run this until nothing changes
        const lastCompleted = Tasks.lastCompleted(tasks);
        const incomplete = Tasks.getIncomplete(tasks);
        const work = lastCompleted
            ? [lastCompleted, ...incomplete]
            : incomplete;
        const tasksToAdd = [];

        const doFlow = (tasks: TTask[]) => {
            let changed = false;
            return {
                changed,
                flowedTasks: tasks.map((task, index) => {
                    // This is...very jacked up. Lets start with only doing "moveable" tasks and go from there
                    // Need to figure out how to move stuff around immovable tasks
                    if (task.completedAt || Tasks.isLocked(task)) {
                        return task;
                    }

                    const prev = index > 0 && tasks[index - 1];
                    const prevEnd = prev ? Tasks.getFinishTime(prev) : null;

                    if (
                        prev &&
                        prevEnd.valueOf() < task.start.valueOf() &&
                        !task.inProgress
                    ) {
                        task.start = prevEnd;
                        changed = true;
                    }

                    if (
                        task.start.valueOf() < DateTime.local().valueOf() &&
                        !task.inProgress
                    ) {
                        task.start = DateTime.local();
                        changed = true;
                    }

                    if (
                        prev &&
                        prevEnd.valueOf() > task.start.valueOf() &&
                        !task.inProgress
                    ) {
                        if (task.move || task.squish) {
                            task.start = prevEnd;
                            changed = true;
                        }
                    }

                    const thisEnd = Tasks.getFinishTime(task);
                    const next = tasks[index + 1];
                    const nextStart = next?.start;

                    if (
                        next &&
                        thisEnd.valueOf() > nextStart.valueOf() &&
                        Tasks.isLocked(next)
                    ) {
                        task.start = Tasks.getFinishTime(next);
                        changed = true;
                    }

                    if (
                        next &&
                        thisEnd.valueOf() > nextStart.valueOf() &&
                        !Tasks.isLocked(next)
                    ) {
                        const difference = thisEnd.diff(nextStart);
                        if (task.squish) {
                            console.log("3");
                            // This is broken
                            // task.duration = task.duration.minus(difference);
                        } else if (task.split) {
                            task.duration = task.duration.minus(difference);
                            changed = true;
                            console.log("4", task.name);
                            tasksToAdd.push({
                                ...task,
                                duration: difference,
                                start: Tasks.getFinishTime(
                                    Utils.lastItem(tasks)
                                ),
                            });
                        }
                    }

                    return task;
                }),
            };
        };

        return Utils.pipe(
            Tasks.sortByStart,
            (tasks: TTask[]) => {
                let { changed, flowedTasks } = doFlow(tasks);
                let changedFlag = changed;
                let processingTasks = flowedTasks;
                while (changedFlag) {
                    let { changed, flowedTasks } = doFlow(processingTasks);
                    changedFlag = changed;
                    processingTasks = flowedTasks;
                }
                return processingTasks;
            },
            (tasks) => {
                return [
                    ...tasks /*.filter((task) => task.duration.as("minute") > 0)*/,
                    ...tasksToAdd,
                ];
            }
        )(work);
    },
    deleteTask: (tasks: TTask[], removeIndex: number) => {
        return tasks.filter((task, index) => index != removeIndex);
    },
    isLocked(task: TTask) {
        return !(task.split || task.move || task.squish);
    },
    getCompleted(tasks: TTask[]) {
        return tasks.filter((task) => !!task.completedAt);
    },
    getIncomplete(tasks: TTask[]) {
        return tasks.filter((task) => !task.completedAt);
    },
    lastCompleted(tasks: TTask[]) {
        return Utils.pipe(Tasks.getCompleted, Utils.lastItem)(tasks);
    },
};
