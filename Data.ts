import * as fs from "fs";
import { DateTime, Duration } from "luxon";
import { TTask } from "./Tasks";
import Store from "./Store";

export default {
    save(tasks: TTask[]) {
        const data = JSON.stringify(tasks);
        fs.writeFileSync("saved.json", data);
    },
    load() {
        try {
            const savedData = require("./saved.json");
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
            Store.resetTasksStore(parsed);
        } catch {}
    },
};
