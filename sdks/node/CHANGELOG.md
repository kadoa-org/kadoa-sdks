# Changelog

## [0.12.1](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.12.0...node-sdk-v0.12.1) (2025-10-05)


### Documentation

* **node-sdk:** update README with builder API documentation ([96b377f](https://github.com/kadoa-org/kadoa-sdks/commit/96b377fce677a37b56bb2410313b705d91f2c178))

## [0.12.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.11.0...node-sdk-v0.12.0) (2025-10-05)


### Features

* **node-sdk:** add fluent builder API for extraction configuration ([80d9596](https://github.com/kadoa-org/kadoa-sdks/commit/80d9596fb403816b39e8114c3af2a726e44fbac8))


### Miscellaneous Chores

* **deps-dev:** bump @types/node in /sdks/node in the development group ([#65](https://github.com/kadoa-org/kadoa-sdks/issues/65)) ([b81b410](https://github.com/kadoa-org/kadoa-sdks/commit/b81b41002512beed3bad3b4d0f2683c054e3c5f7))
* **deps-dev:** bump the development group across 1 directory with 2 updates ([#63](https://github.com/kadoa-org/kadoa-sdks/issues/63)) ([bb15c9a](https://github.com/kadoa-org/kadoa-sdks/commit/bb15c9a42edad7164c9d681f5d1b1a1d98eddc9b))
* **spec:** update OpenAPI spec ([#66](https://github.com/kadoa-org/kadoa-sdks/issues/66)) ([ab44f94](https://github.com/kadoa-org/kadoa-sdks/commit/ab44f946ba0e6da9f5ffc383eaeedcb4fe932bc9))
* **spec:** update OpenAPI spec ([#67](https://github.com/kadoa-org/kadoa-sdks/issues/67)) ([af0d253](https://github.com/kadoa-org/kadoa-sdks/commit/af0d253b6a73fd5f498dd870c533e6e24190180c))

## [0.11.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.10.0...node-sdk-v0.11.0) (2025-09-29)


### Features

* **node-sdk:** add extraction builder service and parallel workflow example ([a2ef3d9](https://github.com/kadoa-org/kadoa-sdks/commit/a2ef3d91fbb01166fe08997ef3da78d8d7910111))
* **spec:** update spec fingerprint ([100820b](https://github.com/kadoa-org/kadoa-sdks/commit/100820b1d0f3280c63776eca00508b061d8c5076))


### Miscellaneous Chores

* **spec:** update OpenAPI spec ([#54](https://github.com/kadoa-org/kadoa-sdks/issues/54)) ([6e1a6a8](https://github.com/kadoa-org/kadoa-sdks/commit/6e1a6a8910c77ce1f5171e151957b89938ebbedc))

## [0.10.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.9.0...node-sdk-v0.10.0) (2025-09-25)


### Features

* **node-sdk:** add browser support and list workflows endpoint ([263703a](https://github.com/kadoa-org/kadoa-sdks/commit/263703a1c215647186553018f6c7dd6f74b24147))
* **node-sdk:** add validation module with rules and anomaly detection ([960f1d2](https://github.com/kadoa-org/kadoa-sdks/commit/960f1d2f2ba640afe8b9f18efac06a0b3baaa6c1))
* **node-sdk:** enhance SDK with comprehensive examples and improved API features ([7aa9b87](https://github.com/kadoa-org/kadoa-sdks/commit/7aa9b87165f3cd82466d8ddb52b8e2e2340177b1))

## [0.9.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.8.0...node-sdk-v0.9.0) (2025-09-24)


### Features

* **spec:** update spec fingerprint ([a1ef20f](https://github.com/kadoa-org/kadoa-sdks/commit/a1ef20f05bfe82230403a3f8aaa10b9443580bfc))


### Bug Fixes

* **node-sdk:** resolve build issues with schemas service and update OpenAPI specs ([da19ba9](https://github.com/kadoa-org/kadoa-sdks/commit/da19ba9fa95aae839aefa3403b9fd747b5b554ce))

## [0.8.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.7.0...node-sdk-v0.8.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* **node-sdk:** CrawlApi renamed to CrawlerApi in generated client
* **node-sdk:** Module imports have been reorganized. External imports from modules/extraction and modules/workflows may need to be updated.

### Features

* **node-sdk:** add logger module to runtime infrastructure ([5dfd685](https://github.com/kadoa-org/kadoa-sdks/commit/5dfd68538d3b7cb73059c1d705f65cbe027f91da))
* **node-sdk:** add notifications, schemas, and user modules with improved error handling ([6791b13](https://github.com/kadoa-org/kadoa-sdks/commit/6791b13056daa3302d55ac7127d2f0817f124e3a))
* **node-sdk:** add realtime demo examples ([24ad917](https://github.com/kadoa-org/kadoa-sdks/commit/24ad917f3b64a23f2906ac9a10b989d7e8ac8a1c))
* **node-sdk:** add realtime WebSocket support for live data streaming ([5366b40](https://github.com/kadoa-org/kadoa-sdks/commit/5366b40089c04d541932227d8c2fb0fe0231a592))
* **node-sdk:** add request ID tracking and improve documentation ([aa4afde](https://github.com/kadoa-org/kadoa-sdks/commit/aa4afde99bd165e1e740394ba0b84c6ce384d328))
* **spec:** update spec fingerprint ([ce5813f](https://github.com/kadoa-org/kadoa-sdks/commit/ce5813f26347cea91c38ab0aabab83ad2f4e0b28))
* **spec:** update spec fingerprint ([c7fd61d](https://github.com/kadoa-org/kadoa-sdks/commit/c7fd61d173aa8c25bac52999a15259089c20f2b9))


### Bug Fixes

* **node-sdk:** update test imports after refactoring ([03f79a6](https://github.com/kadoa-org/kadoa-sdks/commit/03f79a6493f2534532cff1d2adc50c8cb166d2c2))


### Miscellaneous Chores

* **deps-dev:** bump zod from 4.1.5 to 4.1.8 ([#39](https://github.com/kadoa-org/kadoa-sdks/issues/39)) ([6f60c05](https://github.com/kadoa-org/kadoa-sdks/commit/6f60c055fdaf8f50dbf91468b81994dc4c6ec9f3))
* **deps-dev:** bump zod from 4.1.8 to 4.1.11 ([#48](https://github.com/kadoa-org/kadoa-sdks/issues/48)) ([d14cc75](https://github.com/kadoa-org/kadoa-sdks/commit/d14cc759b79997cea1fd5e8db66c45cf930a3c01))
* **deps:** bump axios from 1.11.0 to 1.12.2 ([#35](https://github.com/kadoa-org/kadoa-sdks/issues/35)) ([59ce617](https://github.com/kadoa-org/kadoa-sdks/commit/59ce617cddd713e1fee5a43e4d4174986368158b))
* **spec:** update OpenAPI spec ([#34](https://github.com/kadoa-org/kadoa-sdks/issues/34)) ([76b0093](https://github.com/kadoa-org/kadoa-sdks/commit/76b009372a2a163533cbae2624e44c3ba85cdedb))
* **spec:** update OpenAPI spec ([#51](https://github.com/kadoa-org/kadoa-sdks/issues/51)) ([eec722e](https://github.com/kadoa-org/kadoa-sdks/commit/eec722e747c265cb5d5538185626c4b02b2a782f))


### Code Refactoring

* **node-sdk:** migrate from command/query pattern to service pattern ([134b0dd](https://github.com/kadoa-org/kadoa-sdks/commit/134b0dd7e79502d443b7ee73a4d87945bd7c51b3))
* **node-sdk:** migrate from modules to internal/domains architecture ([636176e](https://github.com/kadoa-org/kadoa-sdks/commit/636176e08dc0048da715af2ce5d2ebf7cad94b07))

## [0.7.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.6.0...node-sdk-v0.7.0) (2025-09-10)


### Features

* **node-sdk:** add submit workflow functionality and refactor internal structure ([1269628](https://github.com/kadoa-org/kadoa-sdks/commit/12696288a45bfbcc2029a0e724eae5942235a92e))

## [0.6.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.5.1...node-sdk-v0.6.0) (2025-09-09)


### Features

* add automated dependency security auditing ([1b633ed](https://github.com/kadoa-org/kadoa-sdks/commit/1b633ed8af3b56e6815e72d959cda9c540f99a17))

## [0.5.1](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.5.0...node-sdk-v0.5.1) (2025-09-09)


### Miscellaneous Chores

* **spec:** update OpenAPI spec ([#22](https://github.com/kadoa-org/kadoa-sdks/issues/22)) ([7146e40](https://github.com/kadoa-org/kadoa-sdks/commit/7146e40b8c6f4cb9055d09593f56db4c2533ca5b))

## [0.5.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.4.0...node-sdk-v0.5.0) (2025-09-09)


### ⚠ BREAKING CHANGES

* **node-sdk:** Extraction module API has been refactored to use query pattern

### Code Refactoring

* **node-sdk:** improve extraction module architecture and testing ([208c89f](https://github.com/kadoa-org/kadoa-sdks/commit/208c89f19b34e3e9a33464ec9811c6874f7d08d9))


### Documentation

* update CLAUDE.md with improved architecture and release documentation ([a90690f](https://github.com/kadoa-org/kadoa-sdks/commit/a90690f9247110757fea5e35ef07c57c521ca6dc))

## [0.4.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.3.0...node-sdk-v0.4.0) (2025-09-08)


### ⚠ BREAKING CHANGES

* **node-sdk:** Complete API redesign - migrated from functional to OO pattern
    - Replace initializeSdk() with new KadoaClient() class instantiation
    - Move runExtraction() to client.extraction.run() method
    - Reorganize file structure into core/ and modules/ directories
    - Consolidate exceptions, events, and utilities under core/
    - Extract business logic into dedicated modules (extraction)

### Features

* add SDK identification headers to all API requests ([19ba4d4](https://github.com/kadoa-org/kadoa-sdks/commit/19ba4d4b42e76b70bc3d1f37a5fc677a59458132))


### Code Refactoring

* **node-sdk:** migrate from functional to object-oriented architecture ([e98815f](https://github.com/kadoa-org/kadoa-sdks/commit/e98815f03bf7b8dd41c99e36cf9614ed856a014c))


### Documentation

* update SDK READMEs to reflect new OO API ([35996a0](https://github.com/kadoa-org/kadoa-sdks/commit/35996a07e903d0486480f6e305d4714beeb4ae07))


### Tests

* restructure test directories and improve test documentation ([3add243](https://github.com/kadoa-org/kadoa-sdks/commit/3add24317e1ed55049a88a998986a0144e30ce12))

## [0.3.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.2.0...node-sdk-v0.3.0) (2025-09-05)


### ⚠ BREAKING CHANGES

* The main entry point has been renamed from initializeApp() to KadoaSDK() in both Node.js and Python SDKs. Users will need to update their imports and initialization code.

### Features

* **node:** unify extraction config and add maxRecords\n\n- Replace dataLimit with maxRecords in defaults\n- Pass full config to workflow creation and polling\n- Remove MAX_DATA_LIMIT constant; use config.maxRecords\n- Type updates to use ExtractionConfig across flow\n\nBREAKING CHANGE: ExtractionOptions now uses maxRecords instead of dataLimit ([46a3752](https://github.com/kadoa-org/kadoa-sdks/commit/46a37528cb28149346341e80f232faebf148dc65))


### Code Refactoring

* rename initializeApp to KadoaSDK for better consistency ([8a18891](https://github.com/kadoa-org/kadoa-sdks/commit/8a18891ff0f7d23c7f453e935028820e2cfe460e))


### Documentation

* update installation instructions in Node.js SDK README to remove axios as a required dependency ([eccddd5](https://github.com/kadoa-org/kadoa-sdks/commit/eccddd55b6ac91c87bd39760419880c9cf0ed58e))

## [0.2.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.1.2...node-sdk-v0.2.0) (2025-09-05)


### Features

* **spec:** update spec fingerprint ([e690fc1](https://github.com/kadoa-org/kadoa-sdks/commit/e690fc100a62612d540868ddcddf3872b4593833))


### Miscellaneous Chores

* add spec fingerprint files and workflow ([62bec84](https://github.com/kadoa-org/kadoa-sdks/commit/62bec8467582ac1110712a9be80dcdf2540587e8))
* bump minimum Node.js version to 22 LTS ([a2eeab2](https://github.com/kadoa-org/kadoa-sdks/commit/a2eeab28d3783da17da432deb87abcdac743b092))

## [0.1.2](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.1.1...node-sdk-v0.1.2) (2025-09-05)


### Miscellaneous Chores

* add initial CHANGELOG.md files for all packages ([ecb9cb5](https://github.com/kadoa-org/kadoa-sdks/commit/ecb9cb50fe58d5fc0f7b6df17b165a7f30941ab3))
* trigger release-please with new PAT ([e3b443c](https://github.com/kadoa-org/kadoa-sdks/commit/e3b443c9eaee6687ef4de03bf312a49ffa612ace))

## 0.1.1 (2025-01-05)

### Features

* Initial release of @kadoa/node-sdk
* Core extraction functionality with workflow management
* Comprehensive TypeScript types and interfaces
* Auto-generated OpenAPI client
* Support for synchronous and asynchronous extraction modes
* Built-in error handling and retry mechanisms
