const DEFAULT_DELAY = 50;
const DEFAULT_MAX_WAIT = 250;


function uniqueByKey(array, key) {
  const seen = [];
  array.reduce((set, value) => {
    if (seen.indexOf(value[key])) return set;
    seen.push(value[key]);
    return [value, ...set];
  }, []);
}

function debounce(func, delay, { maxWait }) {
  let timeout;
  let wait;
  return (...args) => {
    if (!wait) wait = new Date();
    window.clearTimeout(timeout);
    if (wait && (new Date() - wait >= maxWait)) func(...args);
    else {
      timeout = window.setTimeout(() => {
        timeout = null;
        wait = null;
        func(...args);
      }, delay);
    }
  };
}

export default class TaskBatcher {
  constructor(runTasks, {
    delay = DEFAULT_DELAY,
    maxWait = DEFAULT_MAX_WAIT,
    renameAddTaskTo
  } = {}) {
    this.queue = [];
    this.runTasks = runTasks;
    this.delay = delay;
    this.maxWait = maxWait;
    if (renameAddTaskTo) this[renameAddTaskTo] = this.addTask;
  }
  addTask(key) {
    return new Promise((resolve, reject) => {
      this.queue = uniqueByKey(this.queue.concat({ key, resolve, reject }), 'key');
      this.processQueue();
    });
  }
  get processQueue() {
    if (!this._processQueue) {
      this._processQueue = debounce(() => {
        const queue = [...this.queue];
        this.queue = [];
        const keys = queue.map(({ key }) => key);
        this.runTasks(keys).then(values => {
          queue.forEach(({ resolve, reject }, index) => {
            const value = values[index];
            if (value instanceof Error) {
              reject(value);
            } else {
              resolve(value);
            }
          });
        });
      }, this.delay, { maxWait: this.maxWait });
    }
    return this._processQueue;
  }
}
