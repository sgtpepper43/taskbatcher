import TaskBatcher from '../src/';
import { describe, it } from 'mocha';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

function idLoader(options) {
  const loadCalls = [];
  const identityBatcher = new TaskBatcher(keys => {
    loadCalls.push(keys);
    return Promise.resolve(keys);
  }, options);
  return [identityBatcher, loadCalls];
}

function timeoutPromise(func, timeout) {
  return new Promise(resolve => {
    setTimeout(() => resolve(func()), timeout);
  });
}

const options = { delay: 10, maxWait: 25 };

describe('API', async () => {
  it('builds as simple TaskBatcher', async () => {
    const identityBatcher = new TaskBatcher(keys => Promise.resolve(keys));

    const promise1 = identityBatcher.addTask(1);
    expect(promise1).to.be.instanceof(Promise);

    const value1 = await promise1;
    expect(value1).to.equal(1);
  });

  it('should handle a runTaskFn that returns on object', async () => {
    /* eslint object-shorthand: 0 */
    const identityBatcher = new TaskBatcher(keys => Promise.resolve(keys.reduce((obj, key) => ({
      ...obj,
      [key]: key
    }), {})));

    const promise1 = identityBatcher.addTask(1);
    expect(promise1).to.be.instanceof(Promise);

    const value1 = await promise1;
    expect(value1).to.equal(1);
  });

  it('batches multiple requests', async () => {
    const [identityBatcher, loadCalls] = idLoader();

    const promise1 = identityBatcher.addTask(1);
    const promise2 = identityBatcher.addTask(2);

    const [value1, value2] = await Promise.all([promise1, promise2]);
    expect(value1).to.equal(1);
    expect(value2).to.equal(2);

    expect(loadCalls).to.deep.equal([[1, 2]]);
  });

  it('coalesces identical requests', async () => {
    const [identityBatcher, loadCalls] = idLoader();

    const promise1a = identityBatcher.addTask(1);
    const promise1b = identityBatcher.addTask(1);

    expect(promise1a).to.equal(promise1b);

    const [value1a, value1b] = await Promise.all([promise1a, promise1b]);
    expect(value1a).to.equal(1);
    expect(value1b).to.equal(1);

    expect(loadCalls).to.deep.equal([[1]]);
  });

  it('should debounce', async () => {
    const runTasks = sinon.spy(keys => Promise.resolve(keys));
    const identityBatcher = new TaskBatcher(runTasks, options);
    const promise1 = identityBatcher.addTask(1);
    const promise2 = timeoutPromise(() => identityBatcher.addTask(2), options.delay - 5);
    const promise3 = timeoutPromise(() => identityBatcher.addTask(3), (options.delay - 5) * 2);

    const [value1, value2, value3] = await Promise.all([promise1, promise2, promise3]);
    expect(value1).to.equal(1);
    expect(value2).to.equal(2);
    expect(value3).to.equal(3);
    expect(runTasks).to.have.been.calledWith([1, 2, 3]);
  });

  it('should only debounce up to maxWait', async () => {
    const runTasks = sinon.spy(keys => Promise.resolve(keys));
    const identityBatcher = new TaskBatcher(runTasks, options);
    const promise1 = identityBatcher.addTask(1);
    const promise2 = timeoutPromise(() => identityBatcher.addTask(2), options.delay - 2);
    const promise3 = timeoutPromise(() => identityBatcher.addTask(3), (options.delay - 2) * 2);
    const promise4 = timeoutPromise(() => identityBatcher.addTask(4), (options.delay - 2) * 3);
    const promise5 = timeoutPromise(() => identityBatcher.addTask(5), (options.delay - 2) * 4);

    const [value1, value2, value3, value4, value5] = await Promise.all([
      promise1, promise2, promise3, promise4, promise5
    ]);
    expect(value1).to.equal(1);
    expect(value2).to.equal(2);
    expect(value3).to.equal(3);
    expect(value4).to.equal(4);
    expect(value5).to.equal(5);
    expect(runTasks).to.have.been.calledWith([1, 2, 3, 4]);
    expect(runTasks).to.have.been.calledWith([5]);
  });
});
