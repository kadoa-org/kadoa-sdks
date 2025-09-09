# Changelog

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
