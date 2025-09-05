# Changelog

## [0.5.0](https://github.com/kadoa-org/kadoa-sdks/compare/python-sdk-v0.4.0...python-sdk-v0.5.0) (2025-09-05)


### ⚠ BREAKING CHANGES

* The main entry point has been renamed from initializeApp() to KadoaSDK() in both Node.js and Python SDKs. Users will need to update their imports and initialization code.

### Features

* **python:** align extraction API with Node and improve typing\n\n- Introduce max_records (replace data_limit) and propagate through flow\n- Use typed CreateWorkflowOptions and openapi client models\n- Simplify HTTP error handling; add from error chaining\n- Clean imports, add lint targets, minor example/test fixes\n\nBREAKING CHANGE: ExtractionOptions now uses max_records instead of data_limit ([3068fcc](https://github.com/kadoa-org/kadoa-sdks/commit/3068fcce0d474c2e30fd824daba5205968e1e458))


### Code Refactoring

* rename initializeApp to KadoaSDK for better consistency ([8a18891](https://github.com/kadoa-org/kadoa-sdks/commit/8a18891ff0f7d23c7f453e935028820e2cfe460e))

## [0.4.0](https://github.com/kadoa-org/kadoa-sdks/compare/python-sdk-v0.3.2...python-sdk-v0.4.0) (2025-09-05)


### Features

* **spec:** update spec fingerprint ([e690fc1](https://github.com/kadoa-org/kadoa-sdks/commit/e690fc100a62612d540868ddcddf3872b4593833))


### Miscellaneous Chores

* add spec fingerprint files and workflow ([62bec84](https://github.com/kadoa-org/kadoa-sdks/commit/62bec8467582ac1110712a9be80dcdf2540587e8))

## [0.3.2](https://github.com/kadoa-org/kadoa-sdks/compare/python-sdk-v0.3.1...python-sdk-v0.3.2) (2025-09-05)


### Miscellaneous Chores

* add initial CHANGELOG.md files for all packages ([ecb9cb5](https://github.com/kadoa-org/kadoa-sdks/commit/ecb9cb50fe58d5fc0f7b6df17b165a7f30941ab3))
* trigger release-please with new PAT ([e3b443c](https://github.com/kadoa-org/kadoa-sdks/commit/e3b443c9eaee6687ef4de03bf312a49ffa612ace))

## 0.3.1 (2025-01-05)

### Features

* Initial release of kadoa-python-sdk
* Core extraction functionality with workflow management  
* Comprehensive type hints and dataclasses
* Auto-generated OpenAPI client
* Support for synchronous and asynchronous extraction modes
* Built-in error handling and retry mechanisms
* Full Python 3.8+ compatibility
