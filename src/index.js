// @flow

const DEFAULT_DELAY = 50;
const DEFAULT_MAX_WAIT = 250;

function uniqueByKey(array: Array<Object>, key: string): Array<Object> {
  const seen: Array<string> = [];
  return array.reduce((set: Array<Object>, value: Object) => {
    if (seen.indexOf(value[key]) !== -1) return set;
    seen.push(value[key]);
    return [...set, value];
  }, []);
}

type DebounceOptions = {
  maxWait: number
};

function debounce(func: Function, delay: number, { maxWait }: DebounceOptions) {
  let timeout: ?number;
  let wait: ?Date;
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

type TaskKey = any;
type TaskResult = any;
type TaskQueue = Array<{ resolve: Function, reject: Function, key: TaskKey }>;
type RunTasks = (keys: Array<TaskKey>) => Promise<Array<TaskResult> | Object>;


type options = {
  delay?: number,
  maxWait?: number,
  renameAddTaskTo?: ?string
}

export default class TaskBatcher {
  queue: TaskQueue;
  runTasks: RunTasks;
  delay: number;
  maxWait: number;
  processQueue: () => void;
  _promiseCache: Object;

  constructor(runTasks: RunTasks, {
    delay = DEFAULT_DELAY,
    maxWait = DEFAULT_MAX_WAIT,
    renameAddTaskTo
  }: options = {}) {
    this.queue = [];
    this.runTasks = runTasks;
    this.delay = delay;
    this.maxWait = maxWait;
    this._promiseCache = {};
    // $FlowIssue: flow can't handle this right now (https://github.com/facebook/flow/issues/1323)
    if (renameAddTaskTo) this[renameAddTaskTo] = this.addTask;

    this.processQueue = debounce(() => {
      const queue: TaskQueue = [...this.queue];
      this.queue = [];
      const keys: Array<TaskKey> = queue.map(({ key }) => key);
      this.runTasks(keys).then(values => {
        const isArray: boolean = values instanceof Array;
        queue.forEach(({ key, resolve, reject }, index) => {
          this._promiseCache[key] = null;
          const value: TaskResult = values[isArray ? index : key];
          if (value instanceof Error) reject(value);
          else resolve(value);
        });
      });
    }, this.delay, { maxWait: this.maxWait });
  }
  addTask(key: TaskKey): Promise<TaskResult> {
    if (this._promiseCache[key]) return this._promiseCache[key];
    const promise: Promise<TaskResult> = new Promise((resolve, reject) => {
      this.queue = uniqueByKey(this.queue.concat({ key, resolve, reject }), 'key');
      this.processQueue();
    });
    this._promiseCache[key] = promise;
    return promise;
  }
}
