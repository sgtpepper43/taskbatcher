const DEFAULT_DELAY = 50;
const DEFAULT_MAX_WAIT = 250;

function uniqueByKey(array, key) {
  const seen = [];
  return array.reduce((set, value) => {
    if (seen.indexOf(value[key]) !== -1) return set;
    seen.push(value[key]);
    return [...set, value];
  }, []);
}

function debounce(func, delay, { maxWait }) {
  let timeout;
  let wait;
  return (...args) => {
    if (!wait) wait = new Date();
    clearTimeout(timeout);
    if (wait && (new Date() - wait >= maxWait)) func(...args);
    else {
      timeout = setTimeout(() => {
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
    this._promiseCache = {};
    if (renameAddTaskTo) this[renameAddTaskTo] = this.addTask;
  }
  addTask(key) {
    if (this._promiseCache[key]) return this._promiseCache[key];
    const promise = new Promise((resolve, reject) => {
      this.queue = uniqueByKey(this.queue.concat({ key, resolve, reject }), 'key');
      this.processQueue();
    });
    this._promiseCache[key] = promise;
    return promise;
  }
  get processQueue() {
    if (!this._processQueue) {
      this._processQueue = debounce(() => {
        const queue = [...this.queue];
        this.queue = [];
        const keys = queue.map(({ key }) => key);
        this.runTasks(keys).then(values => {
          const isArray = values instanceof Array;
          queue.forEach(({ key, resolve, reject }, index) => {
            this._promiseCache[key] = null;
            const value = values[isArray ? index : key];
            if (value instanceof Error) reject(value);
            else resolve(value);
          });
        });
      }, this.delay, { maxWait: this.maxWait });
    }
    return this._processQueue;
  }
}
