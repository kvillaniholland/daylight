import test from "ava";
import { DateTime, Duration } from "luxon";
import Store from "./Store";

const testTask = {
    id: 0,
    name: "a",
    start: DateTime.local(),
    squish: false,
    move: false,
    split: false,
    inProgress: false,
    duration: Duration.fromObject({ minutes: 30 }),
};
const newTask = { ...testTask, name: "b", id: 1 };

test.afterEach((t) => {
    Store.resetTasksStore([testTask]);
});

test.serial("resetTasksStore", (t) => {
    t.deepEqual(Store.resetTasksStore([newTask]), [newTask]);
});

test.serial("get tasks", (t) => {
    t.deepEqual(Store.tasks, [testTask]);
});

test("addTask", (t) => {
    // all methods should return the store.
    t.deepEqual(Store.addTask(newTask), [testTask, newTask]);
});

// test("getTaskById", (t) => {
//     t.is(Store.getTaskById(0), testTask);
//     t.is(Store.getTaskById(4), undefined);
// });

// test("updateTaskById", (t) => {
//     t.deepEqual(Store.updateTaskById(0, { name: "c" }), [
//         { ...testTask, name: "c" },
//     ]);
//     t.deepEqual(Store.updateTaskById(4, { name: "c" }), [testTask]);
// });
