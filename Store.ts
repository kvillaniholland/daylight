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
        this._tasks.push(task);
        return this.tasks;
    }

    resetTasksStore(tasks: TTask[]) {
        this._tasks = tasks;
        return this.tasks;
    }
}

const appStore = new AppStore();
export default appStore;
