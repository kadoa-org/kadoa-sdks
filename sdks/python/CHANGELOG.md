# Changelog

## [0.17.0](https://github.com/kadoa-org/kadoa-sdks/compare/python-sdk-v0.7.0...python-sdk-v0.17.0) (2025-11-12)


### Features

* add version check on client initialization ([698e02b](https://github.com/kadoa-org/kadoa-sdks/commit/698e02bc9904048a28313e815e3085ee2fed075b))
* make workflow name optional ([7796292](https://github.com/kadoa-org/kadoa-sdks/commit/77962921cb7edd336cfd84d8a0ed1fa727735b07))
* Modernize Python SDK and align with Node.js functionality ([#133](https://github.com/kadoa-org/kadoa-sdks/issues/133)) ([6794c9f](https://github.com/kadoa-org/kadoa-sdks/commit/6794c9fdbf76a6c01ac2b15f350abd66f7780e6e))
* **node-sdk:** make entity optional in schema builder API (KAD-3462) ([#101](https://github.com/kadoa-org/kadoa-sdks/issues/101)) ([12e8027](https://github.com/kadoa-org/kadoa-sdks/commit/12e8027296379b842c281a85179073bc955745d9))
* **spec:** update spec fingerprint ([5afb9bb](https://github.com/kadoa-org/kadoa-sdks/commit/5afb9bb5660f20b22103690477dfe02665cf3713))
* **spec:** update spec fingerprint ([100820b](https://github.com/kadoa-org/kadoa-sdks/commit/100820b1d0f3280c63776eca00508b061d8c5076))
* **spec:** update spec fingerprint ([a1ef20f](https://github.com/kadoa-org/kadoa-sdks/commit/a1ef20f05bfe82230403a3f8aaa10b9443580bfc))
* **spec:** update spec fingerprint ([ce5813f](https://github.com/kadoa-org/kadoa-sdks/commit/ce5813f26347cea91c38ab0aabab83ad2f4e0b28))
* **spec:** update spec fingerprint ([c7fd61d](https://github.com/kadoa-org/kadoa-sdks/commit/c7fd61d173aa8c25bac52999a15259089c20f2b9))


### Bug Fixes

* handle workflow entity field and displayState DELETED enum value ([3405973](https://github.com/kadoa-org/kadoa-sdks/commit/340597398f2dd4fda9752bc973d6f490445744ad))
* **node-sdk:** add workflow update/delete and real-time extraction support ([56f0fbf](https://github.com/kadoa-org/kadoa-sdks/commit/56f0fbfa33cf398a8aca9b2d9619d8621ad3c4b0))
* **python-sdk:** add SSL certificate verification using certifi ([6e0de23](https://github.com/kadoa-org/kadoa-sdks/commit/6e0de239b3528859b6271131ec619ef7ecb865f8))
* **python-sdk:** export settings module from core and bump version to 0.8.0rc4 ([20a2765](https://github.com/kadoa-org/kadoa-sdks/commit/20a2765f3efad9655950817890b999057028e305))
* **python-sdk:** remove workflow displayState enum patch ([0bf8b0e](https://github.com/kadoa-org/kadoa-sdks/commit/0bf8b0ebfb37f8e8b799f6faba2114b65ed0da4e))
* **python-sdk:** use getattr instead of .get() for Pydantic response objects in seeder ([6ce43e0](https://github.com/kadoa-org/kadoa-sdks/commit/6ce43e0d747eff61b0e9b25781123c8871ea07fd))
* **python-sdk:** webhook channel config serialization issue ([f9b1972](https://github.com/kadoa-org/kadoa-sdks/commit/f9b1972dbcf998974d4846a6c365b53d5799d909))


### Miscellaneous Chores

* bump Python SDK version to 0.8.0rc5 ([8c47937](https://github.com/kadoa-org/kadoa-sdks/commit/8c47937a132a1de5d1b5d4031723fa52dc6478cc))
* bump Python SDK version to 0.8.0rc6 ([ce1a18e](https://github.com/kadoa-org/kadoa-sdks/commit/ce1a18e374bc7f76e34ad1e0d1c35cbb0b9dd368))
* **deps-dev:** bump @types/bun from 1.3.0 to 1.3.1 ([#112](https://github.com/kadoa-org/kadoa-sdks/issues/112)) ([20b8fa1](https://github.com/kadoa-org/kadoa-sdks/commit/20b8fa1704e0d21aa2996caabdf8c577424f7283))
* **deps-dev:** bump @types/node in /examples/node-examples ([#94](https://github.com/kadoa-org/kadoa-sdks/issues/94)) ([94f64a7](https://github.com/kadoa-org/kadoa-sdks/commit/94f64a78b55f68b5e3293361e88595d72783d2ed))
* **deps-dev:** bump @types/node in /tools/codegen ([#98](https://github.com/kadoa-org/kadoa-sdks/issues/98)) ([ec79d81](https://github.com/kadoa-org/kadoa-sdks/commit/ec79d8158a27dbf643f1d35c93530a92eca70c91))
* **deps:** bump @openapitools/openapi-generator-cli in /tools/codegen ([#96](https://github.com/kadoa-org/kadoa-sdks/issues/96)) ([a600e5c](https://github.com/kadoa-org/kadoa-sdks/commit/a600e5c9f9160eed7788e69cb82fdb2717a1b1bc))
* **node-sdk:** release 0.17.0 ([523a17e](https://github.com/kadoa-org/kadoa-sdks/commit/523a17e6e449676bdbd67568f1b116af2c1cba49))
* **python-sdk:** bump version to 0.8.0rc12 ([bd4d8fe](https://github.com/kadoa-org/kadoa-sdks/commit/bd4d8fee85e1974a17fbee601e904104461192bd))
* **python-sdk:** bump version to 0.8.0rc13 ([9f96326](https://github.com/kadoa-org/kadoa-sdks/commit/9f9632674915e335dc1ea3082abd0784fe533ab6))
* **python-sdk:** bump version to 0.8.0rc13 ([4e4f585](https://github.com/kadoa-org/kadoa-sdks/commit/4e4f5851b64656dace91f3ce0cbb294eb7252ebf))
* **python-sdk:** bump version to 0.8.0rc3 ([8497611](https://github.com/kadoa-org/kadoa-sdks/commit/8497611c73858ff10599c13129cb04b217538d9f))
* **python-sdk:** bump version to 0.8.0rc7 ([2bcfd41](https://github.com/kadoa-org/kadoa-sdks/commit/2bcfd41698671e1ee5f98fec9180e23720b53c64))
* **python-sdk:** bump version to 0.8.0rc9 ([fd30388](https://github.com/kadoa-org/kadoa-sdks/commit/fd303887b2c337c2109589c5025373ff2d46e371))
* **python-sdk:** improve type annotations in data fetcher service and bump version to 0.8.0rc11 ([26939be](https://github.com/kadoa-org/kadoa-sdks/commit/26939bed5a2ca156a9b8aea6861d1fb95c4a5f3f))
* **python-sdk:** prepare 0.8.0rc3 release ([3ff8d10](https://github.com/kadoa-org/kadoa-sdks/commit/3ff8d1049c63e4791a5f3f00693edac5ceea5413))
* **python-sdk:** update documentation and test references ([d30858f](https://github.com/kadoa-org/kadoa-sdks/commit/d30858f4f3fe43e10f9478902cc1a2a0f88ac6a4))
* **python-sdk:** update Python requirement to 3.12+ and bump version to 0.8.0rc8 ([989d001](https://github.com/kadoa-org/kadoa-sdks/commit/989d0016b885e90910578fa47f9e5ec8c4240c48))
* **python-sdk:** update SDK with py.typed and improvements ([09e4d1f](https://github.com/kadoa-org/kadoa-sdks/commit/09e4d1f0b8b75c63202301ed172da545162bb0b7))
* remove debug print statement from workflow manager service ([770bec9](https://github.com/kadoa-org/kadoa-sdks/commit/770bec994ef104856f6fa285496cd2f86442de0b))
* **spec:** update OpenAPI spec ([#100](https://github.com/kadoa-org/kadoa-sdks/issues/100)) ([46631ff](https://github.com/kadoa-org/kadoa-sdks/commit/46631ffa9b13e3ce0f21d7d9551d37688c2d64aa))
* **spec:** update OpenAPI spec ([#148](https://github.com/kadoa-org/kadoa-sdks/issues/148)) ([3b855fe](https://github.com/kadoa-org/kadoa-sdks/commit/3b855fe6197e22f36e6fe86e308a13596db38f7f))
* **spec:** update OpenAPI spec ([#34](https://github.com/kadoa-org/kadoa-sdks/issues/34)) ([76b0093](https://github.com/kadoa-org/kadoa-sdks/commit/76b009372a2a163533cbae2624e44c3ba85cdedb))
* **spec:** update OpenAPI spec ([#51](https://github.com/kadoa-org/kadoa-sdks/issues/51)) ([eec722e](https://github.com/kadoa-org/kadoa-sdks/commit/eec722e747c265cb5d5538185626c4b02b2a782f))
* **spec:** update OpenAPI spec ([#54](https://github.com/kadoa-org/kadoa-sdks/issues/54)) ([6e1a6a8](https://github.com/kadoa-org/kadoa-sdks/commit/6e1a6a8910c77ce1f5171e151957b89938ebbedc))
* **spec:** update OpenAPI spec ([#66](https://github.com/kadoa-org/kadoa-sdks/issues/66)) ([ab44f94](https://github.com/kadoa-org/kadoa-sdks/commit/ab44f946ba0e6da9f5ffc383eaeedcb4fe932bc9))
* **spec:** update OpenAPI spec ([#67](https://github.com/kadoa-org/kadoa-sdks/issues/67)) ([af0d253](https://github.com/kadoa-org/kadoa-sdks/commit/af0d253b6a73fd5f498dd870c533e6e24190180c))
* **spec:** update OpenAPI spec ([#81](https://github.com/kadoa-org/kadoa-sdks/issues/81)) ([a6ca334](https://github.com/kadoa-org/kadoa-sdks/commit/a6ca3348b5000fa4672118eecb0778f8c3453cc7))
* **spec:** update OpenAPI spec ([#86](https://github.com/kadoa-org/kadoa-sdks/issues/86)) ([ca6b132](https://github.com/kadoa-org/kadoa-sdks/commit/ca6b132f4dbb2b62c73c6409b5191354ccdef236))
* **spec:** update OpenAPI spec ([#92](https://github.com/kadoa-org/kadoa-sdks/issues/92)) ([57cb113](https://github.com/kadoa-org/kadoa-sdks/commit/57cb113cd6f18ceed8875e5b640522334f6c853b))
* update generated code and dependencies ([f394086](https://github.com/kadoa-org/kadoa-sdks/commit/f3940865532803e77c899da1ded9bae0bb7fd595))


### Code Refactoring

* **node-sdk:** restructure with domain-first architecture and ACLs ([3c70296](https://github.com/kadoa-org/kadoa-sdks/commit/3c702969162a340faf4c734e6f0293308f5760de))
* **python-sdk:** remove base_url from KadoaClientConfig ([9a42fde](https://github.com/kadoa-org/kadoa-sdks/commit/9a42fde20b23987aa2c090054bad51c05a0dfbc8))
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
