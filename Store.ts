let tasksStore = [];
const categories = ["Work", "Break", "Skills", "Upkeep"];
const resetTasksStore = (newTasks) => (tasksStore = newTasks);

export default { tasksStore, categories, resetTasksStore };
