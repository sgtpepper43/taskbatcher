# TaskBatcher

TaskBatcher is a utility that lets you easily run multiple tasks in a single batch.
Partially inspired by Facebook's [DataLoader](https://github.com/facebook/dataloader)

![build status](https://api.travis-ci.org/sgtpepper43/taskbatcher.svg)

## Getting Started

Install with npm
```bash
npm i --save taskbatcher
```

TaskBatcher uses the global `Promise` class, so use a polyfill or transpile with babel or tell everyone who uses your website to get a decent browser.

You'll need to provide a `runTasksFn` function when creating a new TaskBatcher.
```javascript
import TaskBatcher from 'taskbatcher';
const taskBatcher = new TaskBatcher(keys => runTasks(keys))
```
The `runTasksFn` function takes on argument, `[key]`, and should return a Promise that either resolves with `[value | Error]` or `{ [key]: value | Error, [key2]: value2 | Error }`.


Then add tasks to the batcher using `addTask`. TaskBatcher will add your keys to a queue, and will run your `runTasksFn` function after a `delay` (default `50ms`) since the last time the function was called (aka, it debounces). They delay's won't stack indefinitely, however, and will eventually run after the `maxWait` ( default `250ms`) limit is reached.

```javascript
taskBatcher.addTask(1).then(data => console.log(`Data received! ${data}`));
```

### API Request Example

TaskBatcher was initially designed around making requests, but it ended up being generic enough to handle any sort of task. Here's how to use it to make api requests:

```javascript
function getUsersByIds(ids) { fetch(`/users?id=${ids.join(',')}`).then(resp => resp.json()); }

const userFetcher = new TaskBatcher(getUsersByIds);
userFetcher.addTask(1).then(user => console.log(`Here's your user: ${user}`));
userFetcher.addTask(2).then(user => console.log(`Here's another user: ${user}`));
userFetcher.addTask(3).then(user => console.log(`And another user: ${user}`));
```

In the above example, only one request will be made (`fetch('/users?id=1,2,3')`).

In case you think it's weird to call `addTask` on `userFetcher`, feel free to rename the `addTask` function using the `renameAddTaskTo` option like so:
```javascript
const userFetcher = new TaskBatcher(getUsersByIds, { renameAddTaskTo: 'fetch' });
userFetcher.fetch(1).then(user => console.log(`Here's your user: ${user}`));
```

## API

#### class TaskBatcher

##### `new TaskBatcher(runTasksFn, [, options])`

Create a new `TaskBatcher` given a task running function and options.

- *runTasksFn*: A function which accepts an Array of keys, and returns a
  Promise which resolves to either an Array of values or a single object with key/value pairs.

- *options*: An optional object of options:
  - *delay*: The number of milliseconds to delay
  - *maxWait*: The maximum time runTasksFn is allowed to be delayed before it’s invoked
  - *renameAddTaskTo*: Renames the `addTask` function to the given value

##### `addTask(key)`

Adds a key, returning a `Promise` for the value represented by that key.

- *key*: A key value to identify your task with.
