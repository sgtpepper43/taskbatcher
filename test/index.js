import TaskBatcher from '../src/';
import { describe, it } from 'mocha';
import chai, { expect } from 'chai';
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
});
