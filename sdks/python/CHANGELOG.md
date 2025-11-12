# Changelog

## [0.17.0](https://github.com/kadoa-org/kadoa-sdks/compare/python-sdk-v0.8.0...python-sdk-v0.17.0) (2025-11-12)


### Bug Fixes

* **python-sdk:** remove workflow displayState enum patch ([0bf8b0e](https://github.com/kadoa-org/kadoa-sdks/commit/0bf8b0ebfb37f8e8b799f6faba2114b65ed0da4e))
* **python-sdk:** use getattr instead of .get() for Pydantic response objects in seeder ([6ce43e0](https://github.com/kadoa-org/kadoa-sdks/commit/6ce43e0d747eff61b0e9b25781123c8871ea07fd))
* **python-sdk:** webhook channel config serialization issue ([f9b1972](https://github.com/kadoa-org/kadoa-sdks/commit/f9b1972dbcf998974d4846a6c365b53d5799d909))


### Miscellaneous Chores

* bump Python SDK version to 0.8.0rc6 ([ce1a18e](https://github.com/kadoa-org/kadoa-sdks/commit/ce1a18e374bc7f76e34ad1e0d1c35cbb0b9dd368))
* **node-sdk:** release 0.17.0 ([523a17e](https://github.com/kadoa-org/kadoa-sdks/commit/523a17e6e449676bdbd67568f1b116af2c1cba49))
* **python-sdk:** bump version to 0.8.0rc12 ([bd4d8fe](https://github.com/kadoa-org/kadoa-sdks/commit/bd4d8fee85e1974a17fbee601e904104461192bd))
* **python-sdk:** bump version to 0.8.0rc13 ([9f96326](https://github.com/kadoa-org/kadoa-sdks/commit/9f9632674915e335dc1ea3082abd0784fe533ab6))
* **python-sdk:** bump version to 0.8.0rc13 ([4e4f585](https://github.com/kadoa-org/kadoa-sdks/commit/4e4f5851b64656dace91f3ce0cbb294eb7252ebf))
* **python-sdk:** bump version to 0.8.0rc7 ([2bcfd41](https://github.com/kadoa-org/kadoa-sdks/commit/2bcfd41698671e1ee5f98fec9180e23720b53c64))
* **python-sdk:** bump version to 0.8.0rc9 ([fd30388](https://github.com/kadoa-org/kadoa-sdks/commit/fd303887b2c337c2109589c5025373ff2d46e371))
* **python-sdk:** improve type annotations in data fetcher service and bump version to 0.8.0rc11 ([26939be](https://github.com/kadoa-org/kadoa-sdks/commit/26939bed5a2ca156a9b8aea6861d1fb95c4a5f3f))
* **python-sdk:** update Python requirement to 3.12+ and bump version to 0.8.0rc8 ([989d001](https://github.com/kadoa-org/kadoa-sdks/commit/989d0016b885e90910578fa47f9e5ec8c4240c48))
* **python-sdk:** update SDK with py.typed and improvements ([09e4d1f](https://github.com/kadoa-org/kadoa-sdks/commit/09e4d1f0b8b75c63202301ed172da545162bb0b7))
* remove debug print statement from workflow manager service ([770bec9](https://github.com/kadoa-org/kadoa-sdks/commit/770bec994ef104856f6fa285496cd2f86442de0b))
* **spec:** update OpenAPI spec ([#148](https://github.com/kadoa-org/kadoa-sdks/issues/148)) ([3b855fe](https://github.com/kadoa-org/kadoa-sdks/commit/3b855fe6197e22f36e6fe86e308a13596db38f7f))


### Code Refactoring

* **python-sdk:** replace manual types with generated models ([4257a05](https://github.com/kadoa-org/kadoa-sdks/commit/4257a055b9c25d57fa10db59feb41501249d6729))

## [0.7.0](https://github.com/kadoa-org/kadoa-sdks/compare/python-sdk-v0.6.1...python-sdk-v0.7.0) (2025-09-09)


### Features

* add automated dependency security auditing ([1b633ed](https://github.com/kadoa-org/kadoa-sdks/commit/1b633ed8af3b56e6815e72d959cda9c540f99a17))

## [0.6.1](https://github.com/kadoa-org/kadoa-sdks/compare/python-sdk-v0.6.0...python-sdk-v0.6.1) (2025-09-09)


### Miscellaneous Chores

* **spec:** update OpenAPI spec ([#22](https://github.com/kadoa-org/kadoa-sdks/issues/22)) ([7146e40](https://github.com/kadoa-org/kadoa-sdks/commit/7146e40b8c6f4cb9055d09593f56db4c2533ca5b))

## [0.6.0](https://github.com/kadoa-org/kadoa-sdks/compare/python-sdk-v0.5.0...python-sdk-v0.6.0) (2025-09-08)


### ⚠ BREAKING CHANGES

* **python-sdk:** Complete API redesign - migrated from functional to OO pattern
    - Replace initialize_sdk() with new KadoaClient() class instantiation
    - Move run_extraction() to client.extraction.run() method
    - Reorganize file structure into core/ and extraction/services/ directories
    - Consolidate exceptions, events, and utilities under core/
    - Extract business logic into service classes
    - Align architecture with Node SDK refactoring for consistency

### Features

* add SDK identification headers to all API requests ([19ba4d4](https://github.com/kadoa-org/kadoa-sdks/commit/19ba4d4b42e76b70bc3d1f37a5fc677a59458132))


### Bug Fixes

* **python-examples:** remove unnecessary asyncio usage ([21a84f9](https://github.com/kadoa-org/kadoa-sdks/commit/21a84f96c264b6a17972a70433961373f8b9af5e))


### Code Refactoring

* **python-sdk:** migrate from functional to object-oriented architecture ([0dd0108](https://github.com/kadoa-org/kadoa-sdks/commit/0dd01085cbe05534a36b1df44b9acb7e80e8245a))


### Documentation

* update SDK READMEs to reflect new OO API ([35996a0](https://github.com/kadoa-org/kadoa-sdks/commit/35996a07e903d0486480f6e305d4714beeb4ae07))


### Tests

* restructure test directories and improve test documentation ([3add243](https://github.com/kadoa-org/kadoa-sdks/commit/3add24317e1ed55049a88a998986a0144e30ce12))


### Styles

* apply Python formatter (Black) to all Python SDK files ([14a3ef2](https://github.com/kadoa-org/kadoa-sdks/commit/14a3ef29a1a393d16ad95bebdc9d6f90198ec635))

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
