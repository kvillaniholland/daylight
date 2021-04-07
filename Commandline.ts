import { DateTime, Duration } from "luxon";
import * as readlineSync from "readline-sync";
import { TTask, Tasks } from "./Tasks";
import Data from "./Data";
import { Parsing, Formatting } from "./Formats";
import Store from "./Store";
import Utils from "./Utils";

export default {
    createOrEditTask(task = undefined): TTask {
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
                          Tasks.getFinishTime(Utils.lastItem(Store.tasks))
                      ) ?? Formatting.formatTime(DateTime.local())
            )
        );

        const category = this.prompt(
            `Category?\n${Store.categories.reduce(
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
            id: task?.id || Utils.lastItem(Store.tasks)?.id + 1 || 0,
        };
    },

    quickAdd() {
        const regex = /([\w|\s]+)\s(\d+)m\s(\d+):(\d+)(am|pm)/g;
        const input = this.prompt("Task");
        const [x, name, duration, hour, minute, half] = regex.exec(input);
        Store.addTask({
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
            id: Utils.lastItem(Store.tasks)?.id + 1 || 0,
        });
        const newTasks = Tasks.rearrange(Store.tasks);
        Store.resetTasksStore(newTasks);
        Data.save(Store.tasks);
        console.log(this.SEP);
    },

    addTask() {
        Store.addTask(this.createOrEditTask());
        const newTasks = Tasks.rearrange(Store.tasks);
        Store.resetTasksStore(newTasks);
        Data.save(Store.tasks);
        console.log(this.SEP);
    },

    editTask() {
        const id = Number(this.prompt("Which?"));
        const editedTask = this.createOrEditTask(Store.getTaskById(id));

        // TODO - this really shouldn't be handled by the commandline module - there should be something inside Tasks to cope with it.
        // store original move/split/squish
        // then lock the task, so that if we edit start time / duration etc
        // those edits dont get immediately overwritten
        const { move, split, squish } = editedTask;
        Store.updateTaskById(id, {
            ...editedTask,
            move: false,
            split: false,
            squish: false,
        });
        const newTasks = Tasks.rearrange(Store.tasks);

        // now restore the original m/s/s before saving the result
        const editedTaskIndex = newTasks.find(
            (task) => task.id == editedTask.id
        );
        const spot = newTasks.indexOf(editedTaskIndex);
        newTasks[spot] = {
            ...editedTaskIndex,
            move,
            split,
            squish,
        };

        Store.resetTasksStore(newTasks);
        Data.save(Store.tasks);
    },

    deleteTask() {
        const id = Number(this.prompt("Which?"));
        Utils.pipe(
            Store.deleteTaskById(id),
            Tasks.rearrange,
            Store.resetTasksStore,
            Data.save
        )(Store.tasks);
    },

    runFlow() {
        Utils.pipe(
            Tasks.rearrange,
            Store.resetTasksStore,
            Data.save
        )(Store.tasks);
    },

    finishTask() {
        const id = Number(this.prompt("Which?"));
        const when = this.prompt(
            "When?",
            Formatting.formatTime(DateTime.local())
        );
        Store.updateTaskById(id, { completedAt: Parsing.parseDate(when) });
        Tasks.rearrange(Store.tasks);
        Data.save(Store.tasks);
    },

    printTasks(tasks: TTask[]) {
        console.table(
            Tasks.sortByStart(tasks).map((task) => ({
                ID: task.id,
                Name: task.name,
                Start: Formatting.formatTime(task.start),
                End: Formatting.formatTime(Tasks.getFinishTime(task)),
                Length: `${Formatting.formatDuration(
                    Tasks.getDuration(task)
                )}m`,
                Status: task.completedAt ? "X" : task.inProgress ? "O" : " ",
                Category: task.category
                    ? `${Formatting.formatCategory(task.category)}`
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
            this.printTasks(Store.tasks);
            console.log(
                `${this.SEP}\n1. Add Task\n2. Edit Task\n3. Finish Task\n4. Delete Task\n5. Run Flow\n6. Quick Add\n7. Start Task`
            );
            const input = readlineSync.question("> ");
            this.commands[input] && this.commands[input]();
        }
    },

    startTask() {
        const id = Number(this.prompt("Which?"));
        const start = Parsing.parseDate(
            this.prompt("Start at?", Formatting.formatTime(DateTime.local()))
        );
        const task = Store.getTaskById(id);
        Store.updateTaskById(id, { ...task, start, inProgress: true });
        const newTasks = Tasks.rearrange(Store.tasks);
        Store.resetTasksStore(newTasks);
        Tasks.rearrange(Store.tasks);
        Data.save(Store.tasks);
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
