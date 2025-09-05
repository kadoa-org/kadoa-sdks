# Changelog

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
