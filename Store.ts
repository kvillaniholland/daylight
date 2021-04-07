import { TTask } from "./Tasks";

class AppStore {
    private _tasks = [];
    private _categories = ["Work", "Break", "Skills", "Upkeep"];

    get tasks() {
        return this._tasks;
    }

    get categories() {
        return this._categories;
    }

    addTask(task: TTask) {
        const id =
            this._tasks.reduce((prevMax, task) => {
                return task.id > prevMax ? task.id : prevMax;
            }, 0) + 1;
        this._tasks.push({ ...task, id });
        return this.tasks;
    }

    resetTasksStore = (tasks: TTask[]) => {
        this._tasks = tasks;
        return this.tasks;
    };

    getTaskById(id: number) {
        return this._tasks.find((task) => task.id === id);
    }

    updateTaskById(id: number, task: any) {
        const index = this._tasks.findIndex((task) => task.id === id);
        const original = this._tasks[index];
        this._tasks[index] = { ...original, ...task };
        return this.tasks;
    }

    deleteTaskById(id: number) {
        this._tasks = this._tasks.filter((task) => task.id != id);
        return this.tasks;
    }
}

const appStore = new AppStore();
export default appStore;
