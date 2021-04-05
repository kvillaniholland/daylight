const readlineSync = require("readline-sync");
const fs = require("fs");
const { DateTime, Duration } = require("luxon");

type Task = {
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

const Data = {
    save: (tasks: Task[]) => {
        const data = JSON.stringify(tasks);
        fs.writeFileSync("data.json", data);
    },
    load: () => {
        try {
            const savedData = require("./data.json");
            const parsed = savedData.map((task) => {
                return {
                    ...task,
                    start: DateTime.fromISO(task.start),
                    duration: Duration.fromISO(task.duration),
                    completedAt: task.completedAt
                        ? DateTime.fromISO(task.completedAt)
                        : null,
                };
            });
            Tasks.updateTasksStore(parsed);
        } catch {}
    },
};

const Utils = {
    pipe: (...fns) => (x) => fns.reduce((v, f) => f(v), x),
    lastItem: (array: Array<any>) => {
        return array[array.length - 1];
    },
};

const Tasks = {
    getFinishTime: (task: Task) => {
        return task?.completedAt || task?.start.plus(task.duration);
    },
    getDuration: (task: Task) => {
        return task?.completedAt
            ? task.completedAt.diff(task.start)
            : task.duration;
    },
    sortByStart: (tasks: Task[]) => {
        return tasks.sort(
            (task1, task2) => task1.start.valueOf() - task2.start.valueOf()
        );
    },
    updateTasksStore: (tasks: Task[]) => {
        tasksStore = tasks;
        return tasksStore;
    },
    rearrange: (tasks: Task[]) => {
        // we should re-run this until nothing changes
        const lastCompleted = Tasks.lastCompleted(tasks);
        const incomplete = Tasks.getIncomplete(tasks);
        const work = lastCompleted
            ? [lastCompleted, ...incomplete]
            : incomplete;
        const tasksToAdd = [];

        const doFlow = (tasks: Task[]) => {
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

                    if (prev && prevEnd.valueOf() < task.start.valueOf()) {
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
            (tasks: Task[]) => {
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
    deleteTask: (tasks: Task[], removeIndex: number) => {
        return tasks.filter((task, index) => index != removeIndex);
    },
    isLocked(task: Task) {
        return !(task.split || task.move || task.squish);
    },
    getCompleted(tasks: Task[]) {
        return tasks.filter((task) => !!task.completedAt);
    },
    getIncomplete(tasks: Task[]) {
        return tasks.filter((task) => !task.completedAt);
    },
    lastCompleted(tasks: Task[]) {
        return Utils.pipe(Tasks.getCompleted, Utils.lastItem)(tasks);
    },
};

const Parsing = {
    parseDate: (input) => {
        const regex = /(\d{1,2}):(\d{1,2})(am|pm)/g;
        const [x, hour, minute, half] = regex.exec(input);
        return DateTime.fromObject({
            minute: Number(minute),
            hour:
                half === "am" || hour == "12"
                    ? Number(hour)
                    : Number(hour) + 12,
        });
    },
    parseDuration: (input) => {
        return Duration.fromObject({ minutes: Number(input) });
    },
};

const Formatting = {
    formatTime: (date) => {
        return date?.toFormat("hh:mma").replace("AM", "am").replace("PM", "pm");
    },
    formatDuration: (duration) => {
        return duration.as("minutes");
    },
    formatCategory: (categoryId: number) => {
        return categories[categoryId];
    },
};

const Commandline = {
    createOrEditTask(task = undefined) {
        const name = this.prompt("Task name?", task?.name);
        const duration = Parsing.parseDuration(
            this.prompt(
                "How long?",
                task ? Formatting.formatDuration(task.duration) : "30"
            )
        );
        const start = Parsing.parseDate(
            this.prompt(
                "Start at?",
                task
                    ? Formatting.formatTime(task.start)
                    : Formatting.formatTime(
                          Tasks.getFinishTime(Utils.lastItem(tasksStore))
                      ) ?? Formatting.formatTime(DateTime.local())
            )
        );

        const category = this.prompt(
            `Category?\n${categories.reduce(
                (prev, curr, index) => `${prev}\n${index}. ${curr}`,
                ""
            )}`,
            task?.category || undefined
        );

        const bool = {
            y: true,
            n: false,
        };

        const squish =
            bool[this.prompt("Squishable?", !!task?.squish ? "y" : "n")];
        const split =
            bool[this.prompt("Splittable?", !!task?.split ? "y" : "n")];
        const move =
            bool[this.prompt("Moveable?", task && !task.move ? "n" : "y")];
        const inProgress =
            bool[this.prompt("In Progress?", !!task?.inProgress ? "y" : "n")];
        return {
            start,
            name,
            duration,
            category,
            split,
            squish,
            move,
            inProgress,
            completedAt: task ? task.completedAt : undefined,
        };
    },

    quickAdd() {
        const regex = /([\w|\s]+)\s(\d+)m\s(\d+):(\d+)(am|pm)/g;
        const input = this.prompt("Task");
        const [x, name, duration, hour, minute, half] = regex.exec(input);
        tasksStore.push({
            start: DateTime.fromObject({
                minute: Number(minute),
                hour:
                    half === "am" || hour == "12"
                        ? Number(hour)
                        : Number(hour) + 12,
            }),
            name,
            duration: Duration.fromObject({ minutes: duration }),
            split: false,
            squish: false,
            move: true,
            inProgress: false,
        });
        const newTasks = Tasks.rearrange(tasksStore);
        Tasks.updateTasksStore(newTasks);
        Data.save(tasksStore);
        console.log(this.SEP);
    },

    addTask() {
        tasksStore.push(this.createOrEditTask());
        const newTasks = Tasks.rearrange(tasksStore);
        Tasks.updateTasksStore(newTasks);
        Data.save(tasksStore);
        console.log(this.SEP);
    },

    editTask() {
        const index = Number(this.prompt("Which?"));
        const editedTask = this.createOrEditTask(tasksStore[index]);

        // TODO - this really shouldn't be handled by the commandline module - there should be something inside Tasks to cope with it.
        // store original move/split/squish
        // then lock the task, so that if we edit start time / duration etc
        // those edits dont get immediately overwritten
        const { move, split, squish } = editedTask;
        tasksStore[index] = {
            ...editedTask,
            move: false,
            split: false,
            squish: false,
        };
        const newTasks = Tasks.rearrange(tasksStore);

        // now restore the original m/s/s before saving the result
        // oops tasks need ids - we'll use name for now
        const editedTaskIndex = newTasks.find(
            (task) => task.name == editedTask.name
        );
        const spot = newTasks.indexOf(editedTaskIndex);
        newTasks[spot] = {
            ...editedTaskIndex,
            move,
            split,
            squish,
        };

        Tasks.updateTasksStore(newTasks);
        Data.save(tasksStore);
    },

    deleteTask() {
        const index = Number(this.prompt("Which?"));
        Utils.pipe(
            (tasks) => Tasks.deleteTask(tasks, index),
            Tasks.rearrange,
            Tasks.updateTasksStore,
            Data.save
        )(tasksStore);
    },

    runFlow() {
        Utils.pipe(
            Tasks.rearrange,
            Tasks.updateTasksStore,
            Data.save
        )(tasksStore);
    },

    finishTask() {
        const index = Number(this.prompt("Which?"));
        const when = this.prompt(
            "When?",
            Formatting.formatTime(DateTime.local())
        );
        tasksStore[index].completedAt = Parsing.parseDate(when);
        Tasks.rearrange(tasksStore);
        Data.save(tasksStore);
    },

    printTasks(tasks: Task[]) {
        console.table(
            Tasks.sortByStart(tasks).map((task) => ({
                Status: task.completedAt ? "X" : task.inProgress ? "O" : " ",
                Start: Formatting.formatTime(task.start),
                Name: task.name,
                Length: `${Formatting.formatDuration(
                    Tasks.getDuration(task)
                )}m`,
                End: Formatting.formatTime(Tasks.getFinishTime(task)),
                Category: task.category
                    ? `(${Formatting.formatCategory(task.category)})`
                    : "",
                Squish: task.squish ? "✓" : " ",
                Split: task.split ? "✓" : " ",
                Move: task.move ? "✓" : " ",
            }))
        );
    },

    prompt: (prompt = "", defaultValue = undefined) => {
        const fullPrompt = `${prompt} ${
            defaultValue ? `(${defaultValue}) ` : " "
        }> `;
        return readlineSync.question(fullPrompt) || defaultValue;
    },

    main() {
        Data.load();
        while (1) {
            this.printTasks(tasksStore);
            console.log(
                `${this.SEP}\n1. Add Task\n2. Edit Task\n3. Finish Task\n4. Delete Task\n5. Run Flow\n6. Quick Add\n7. Start Task`
            );
            const input = readlineSync.question("> ");
            this.commands[input] && this.commands[input]();
        }
    },

    startTask() {
        const index = Number(this.prompt("Which?"));
        const start = Parsing.parseDate(
            this.prompt("Start at?", Formatting.formatTime(DateTime.local()))
        );
        const task = tasksStore[index];
        tasksStore[index] = { ...task, start, inProgress: true };
        const newTasks = Tasks.rearrange(tasksStore);
        Tasks.updateTasksStore(newTasks);
        Tasks.rearrange(tasksStore);
        Data.save(tasksStore);
    },

    get commands() {
        return {
            1: () => this.addTask(),
            2: () => this.editTask(),
            3: () => this.finishTask(),
            4: () => this.deleteTask(),
            5: () => this.runFlow(),
            6: () => this.quickAdd(),
            7: () => this.startTask(),
        };
    },
    SEP: `----------------`,
};

let tasksStore = [];
const categories = ["Work", "Break", "Skills", "Upkeep"];

Commandline.main();
