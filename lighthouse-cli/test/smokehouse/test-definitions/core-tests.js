/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// TODO(bckenny): add support for flags?
/** @type {ReadonlyArray<Smokehouse.TestDfn>} */
const smokeTests = [{
  id: 'a11y',
  expectations: require('./a11y/expectations.js'),
  config: require('./a11y/a11y-config.js'),
  runParallel: true,
}, {
  id: 'errors',
  expectations: require('./errors/error-expectations.js'),
  config: require('./errors/error-config.js'),
  runParallel: false,
}, {
  id: 'oopif',
  expectations: require('./oopif/oopif-expectations.js'),
  config: require('./oopif/oopif-config.js'),
  runParallel: true,
}, {
  id: 'pwa',
  expectations: require('./pwa/pwa-expectations.js'),
  config: require('./pwa/pwa-config.js'),
  runParallel: true,
}, {
  id: 'pwa2',
  expectations: require('./pwa/pwa2-expectations.js'),
  config: require('./pwa/pwa-config.js'),
  runParallel: true,
}, {
  id: 'pwa3',
  expectations: require('./pwa/pwa3-expectations.js'),
  config: require('./pwa/pwa-config.js'),
  runParallel: true,
}, {
  id: 'dbw',
  expectations: require('./dobetterweb/dbw-expectations.js'),
  runParallel: true,
}, {
  id: 'redirects',
  expectations: require('./redirects/expectations.js'),
  config: require('./redirects/redirects-config.js'),
  runParallel: true,
}, {
  id: 'seo',
  expectations: require('./seo/expectations.js'),
  config: require('./seo/seo-config.js'),
  runParallel: true,
}, {
  id: 'offline',
  expectations: require('./offline-local/offline-expectations.js'),
  config: require('./offline-local/offline-config.js'),
  runParallel: false,
}, {
  id: 'byte',
  expectations: require('./byte-efficiency/expectations.js'),
  config: require('./byte-efficiency/byte-config.js'),
  runParallel: false,
}, {
  id: 'perf',
  expectations: require('./perf/expectations.js'),
  config: require('./perf/perf-config.js'),
  runParallel: false,
}, {
  id: 'lantern',
  expectations: require('./lantern/lantern-expectations.js'),
  config: require('./lantern/lantern-config.js'),
  runParallel: true,
}, {
  id: 'metrics',
  expectations: require('./tricky-metrics/expectations.js'),
  config: require('../../../../lighthouse-core/config/perf-config.js'),
  runParallel: true,
}];

module.exports = smokeTests;
