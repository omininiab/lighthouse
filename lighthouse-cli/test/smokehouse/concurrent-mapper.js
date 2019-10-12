/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * A class that maintains a concurrency pool to coordinate many jobs that should
 * only be run `concurrencyLimit` at a time.
 * API inspired by http://bluebirdjs.com/docs/api/promise.map.html, but
 * independent callers of `concurrentMap()` share the same concurrency limit.
 */
class ConcurrentMapper {
  constructor() {
    /** @type {Set<Promise<any>>} */
    this._promisePool = new Set();
  }

  /**
   * Runs callbackfn on `values` in parallel, at a max of `concurrencyLimit` at
   * a time across all callers on this instance. Resolves to an array of the
   * results (for each caller separately) or rejects with the first rejected
   * result.
   * @template T, U
   * @param {Array<T>} values
   * @param {(value: T, index: number, array: Array<T>) => Promise<U>} callbackfn
   * @param {number} concurrencyLimit
   * @return {Promise<Array<U>>}
   */
  async concurrentMap(values, callbackfn, concurrencyLimit) {
    const result = [];

    for (let i = 0; i < values.length; i++) {
      // Wait until concurrencyLimit allows another run.
      while (this._promisePool.size >= concurrencyLimit) {
        // Unconditionally catch since we only care about our own failures
        // (caught in the Promise.all below), not other callers.
        await Promise.race(this._promisePool).catch(() => {});
      }

      // innerPromise removes itself from the pool and resolves on return from callback.
      const innerPromise = callbackfn(values[i], i, values)
        .finally(() => this._promisePool.delete(innerPromise));

      this._promisePool.add(innerPromise);
      result.push(innerPromise);
    }

    return Promise.all(result);
  }
}

module.exports = ConcurrentMapper;
