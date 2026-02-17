# Changelog

## [0.20.3](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.20.2...node-sdk-v0.20.3) (2026-02-17)


### Bug Fixes

* **node-sdk:** remove create/update rule and sync workflow state enum ([79463c6](https://github.com/kadoa-org/kadoa-sdks/commit/79463c6a709b5626cde07f74e056755e592b3df7))

## [0.20.2](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.20.1...node-sdk-v0.20.2) (2025-12-18)


### Bug Fixes

* **node-sdk:** use type assertion for workflow request union ([6470a50](https://github.com/kadoa-org/kadoa-sdks/commit/6470a5072bc2213ab9f8bcd57a04eec4c4561f4f))

## [0.20.1](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.20.0...node-sdk-v0.20.1) (2025-12-18)


### Bug Fixes

* **node-sdk:** use conditional spread for optional entity field ([fd1b3ef](https://github.com/kadoa-org/kadoa-sdks/commit/fd1b3ef5fede6bf580bc3668b00d2e0abf32295b))

## [0.20.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.19.3...node-sdk-v0.20.0) (2025-12-18)


### Features

* **node-sdk,python-sdk:** add crawler domain ([#192](https://github.com/kadoa-org/kadoa-sdks/issues/192)) ([fd26160](https://github.com/kadoa-org/kadoa-sdks/commit/fd2616055dcd9aa85ed3a8dbef996033cb9b5939))
* **node-sdk,python-sdk:** add type-safe schema field validation ([#188](https://github.com/kadoa-org/kadoa-sdks/issues/188)) ([2e81764](https://github.com/kadoa-org/kadoa-sdks/commit/2e81764fd2fd39fb1e5e1a0be2049729aa9c0e25))


### Bug Fixes

* improve test isolation and sync Python SDK with Node.js ([#195](https://github.com/kadoa-org/kadoa-sdks/issues/195)) ([a12867e](https://github.com/kadoa-org/kadoa-sdks/commit/a12867ece56393331f22ed9c1dcd744070a9144e))

## [0.19.3](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.19.2...node-sdk-v0.19.3) (2025-12-01)


### Bug Fixes

* **node-sdk:** remove zod from production dependencies for monorepo compatibility ([#180](https://github.com/kadoa-org/kadoa-sdks/issues/180)) ([2174cd0](https://github.com/kadoa-org/kadoa-sdks/commit/2174cd09b0ccdccb85bdfed26b189836768eba4a))

## [0.19.2](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.19.1...node-sdk-v0.19.2) (2025-11-24)


### Bug Fixes

* properly destructure extract() parameters (userPrompt, interval, schedules, location) ([#171](https://github.com/kadoa-org/kadoa-sdks/issues/171)) ([2ab149b](https://github.com/kadoa-org/kadoa-sdks/commit/2ab149b0fed38d1ad71d30c140f90333744c7ada))


### Miscellaneous Chores

* **deps:** bump zod in /sdks/node in the production group ([#173](https://github.com/kadoa-org/kadoa-sdks/issues/173)) ([ebb86b3](https://github.com/kadoa-org/kadoa-sdks/commit/ebb86b305296f480e19378af1197054ecc49d8e0))

## [0.19.1](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.19.0...node-sdk-v0.19.1) (2025-11-20)


### Miscellaneous Chores

* set minimum Node.js version to 22 ([dd99871](https://github.com/kadoa-org/kadoa-sdks/commit/dd9987142f29e99d638b535ea84f176bb173e249))
* **spec:** update OpenAPI spec ([#168](https://github.com/kadoa-org/kadoa-sdks/issues/168)) ([99d1116](https://github.com/kadoa-org/kadoa-sdks/commit/99d111653d888bc37f98e97871d4fdc7a5a11a1e))

## [0.19.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.18.1...node-sdk-v0.19.0) (2025-11-18)


### Features

* **node-sdk:** make name optional in ExtractOptionsInternal ([767e395](https://github.com/kadoa-org/kadoa-sdks/commit/767e395b7eb01886150504b0821d8d7b660fdd6a))


### Bug Fixes

* skip entity detection for agentic-navigation and require userPrompt ([#167](https://github.com/kadoa-org/kadoa-sdks/issues/167)) ([403a884](https://github.com/kadoa-org/kadoa-sdks/commit/403a884210f45682b643a8fd893d2424ccdf346e))


### Miscellaneous Chores

* **deps-dev:** bump tsup from 8.5.0 to 8.5.1 ([#161](https://github.com/kadoa-org/kadoa-sdks/issues/161)) ([e96994c](https://github.com/kadoa-org/kadoa-sdks/commit/e96994c6dc58de63808413e59987e4301015bd84))
* **deps:** bump es-toolkit from 1.41.0 to 1.42.0 ([#160](https://github.com/kadoa-org/kadoa-sdks/issues/160)) ([2a4c0ea](https://github.com/kadoa-org/kadoa-sdks/commit/2a4c0ea5f547f940acc39aa56fa8000f931aed0f))
* **deps:** bump es-toolkit in /sdks/node in the production group ([#164](https://github.com/kadoa-org/kadoa-sdks/issues/164)) ([f4a7951](https://github.com/kadoa-org/kadoa-sdks/commit/f4a7951c747df83d5da5d1656fb30e0c977a1712))
* regenerate SDKs after PR [#156](https://github.com/kadoa-org/kadoa-sdks/issues/156) breaking changes ([0d73a3a](https://github.com/kadoa-org/kadoa-sdks/commit/0d73a3a00ab12c84520de5813bf9d1c2d7e6b7c6))
* **spec:** update OpenAPI spec ([#156](https://github.com/kadoa-org/kadoa-sdks/issues/156)) ([f1ca2b9](https://github.com/kadoa-org/kadoa-sdks/commit/f1ca2b9b395842abd727460e28624a52a71535cb))

## [0.18.1](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.18.0...node-sdk-v0.18.1) (2025-11-12)


### Miscellaneous Chores

* update manifest to reflect node-sdk 0.18.0 release ([2a5357b](https://github.com/kadoa-org/kadoa-sdks/commit/2a5357b1e62a6b4e1eb50a7df0a9b049f80f3870))

## [0.18.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.17.0...node-sdk-v0.18.0) (2025-11-12)


### Miscellaneous Chores

* **deps-dev:** bump @types/node in /sdks/node in the development group ([#147](https://github.com/kadoa-org/kadoa-sdks/issues/147)) ([a2c2d82](https://github.com/kadoa-org/kadoa-sdks/commit/a2c2d8203639b98c9ca194f9d31ce1b61efa43d1))
* **spec:** update OpenAPI spec ([#148](https://github.com/kadoa-org/kadoa-sdks/issues/148)) ([3b855fe](https://github.com/kadoa-org/kadoa-sdks/commit/3b855fe6197e22f36e6fe86e308a13596db38f7f))

## [0.17.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.16.2...node-sdk-v0.17.0) (2025-11-10)


### Features

* add version check on client initialization ([698e02b](https://github.com/kadoa-org/kadoa-sdks/commit/698e02bc9904048a28313e815e3085ee2fed075b))
* make workflow name optional ([7796292](https://github.com/kadoa-org/kadoa-sdks/commit/77962921cb7edd336cfd84d8a0ed1fa727735b07))
* Modernize Python SDK and align with Node.js functionality ([#133](https://github.com/kadoa-org/kadoa-sdks/issues/133)) ([6794c9f](https://github.com/kadoa-org/kadoa-sdks/commit/6794c9fdbf76a6c01ac2b15f350abd66f7780e6e))


### Miscellaneous Chores

* **deps-dev:** bump @types/node in /sdks/node in the development group ([#123](https://github.com/kadoa-org/kadoa-sdks/issues/123)) ([7b06281](https://github.com/kadoa-org/kadoa-sdks/commit/7b06281f8e71d2bd0582f9555bedc76fb4198c44))
* **deps:** bump axios in /sdks/node in the production group ([#132](https://github.com/kadoa-org/kadoa-sdks/issues/132)) ([5437461](https://github.com/kadoa-org/kadoa-sdks/commit/54374610df8a3e01ca311d5ca21755a3e0d4dd75))
* **main:** release node-sdk 0.17.0 ([#130](https://github.com/kadoa-org/kadoa-sdks/issues/130)) ([d8d10b2](https://github.com/kadoa-org/kadoa-sdks/commit/d8d10b2ec988da311155182e26f835bdf62fa257))
* **node-sdk:** release 0.17.0 ([523a17e](https://github.com/kadoa-org/kadoa-sdks/commit/523a17e6e449676bdbd67568f1b116af2c1cba49))
* **python-sdk:** prepare 0.8.0rc3 release ([3ff8d10](https://github.com/kadoa-org/kadoa-sdks/commit/3ff8d1049c63e4791a5f3f00693edac5ceea5413))
* update Node.js version requirement to 24 ([d96e596](https://github.com/kadoa-org/kadoa-sdks/commit/d96e596052479277624cedecf3189a68e9380bf5))

## [0.16.2](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.16.1...node-sdk-v0.16.2) (2025-11-03)


### ⚠ BREAKING CHANGES

* **node-sdk:** RealtimeConfig.teamApiKey renamed to apiKey

### Features

* **node-sdk:** allow personal API keys for realtime connections ([#129](https://github.com/kadoa-org/kadoa-sdks/issues/129)) ([779e6fd](https://github.com/kadoa-org/kadoa-sdks/commit/779e6fde74e4bd7ee25a622e60af5be6d6ef7aa6))

## [0.16.1](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.16.0...node-sdk-v0.16.1) (2025-11-03)


### Bug Fixes

* **node-sdk:** type migrations and bypassPreview parameter support ([#127](https://github.com/kadoa-org/kadoa-sdks/issues/127)) ([762f6cb](https://github.com/kadoa-org/kadoa-sdks/commit/762f6cb0749ed3c09b56f59e9d738297c87ed3b3))

## [0.16.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.15.1...node-sdk-v0.16.0) (2025-11-03)


### ⚠ BREAKING CHANGES

* **node-sdk:** CrawlApi renamed to CrawlerApi in generated client
* **node-sdk:** Module imports have been reorganized. External imports from modules/extraction and modules/workflows may need to be updated.

### Features

* **node-sdk:** add browser support and list workflows endpoint ([263703a](https://github.com/kadoa-org/kadoa-sdks/commit/263703a1c215647186553018f6c7dd6f74b24147))
* **node-sdk:** add extraction builder service and parallel workflow example ([a2ef3d9](https://github.com/kadoa-org/kadoa-sdks/commit/a2ef3d91fbb01166fe08997ef3da78d8d7910111))
* **node-sdk:** add fluent builder API for extraction configuration ([80d9596](https://github.com/kadoa-org/kadoa-sdks/commit/80d9596fb403816b39e8114c3af2a726e44fbac8))
* **node-sdk:** add fluent schema builder with create method ([be5b65d](https://github.com/kadoa-org/kadoa-sdks/commit/be5b65d5d160289c9d256d8627d94521b0d9b109))
* **node-sdk:** add logger module to runtime infrastructure ([5dfd685](https://github.com/kadoa-org/kadoa-sdks/commit/5dfd68538d3b7cb73059c1d705f65cbe027f91da))
* **node-sdk:** add notifications, schemas, and user modules with improved error handling ([6791b13](https://github.com/kadoa-org/kadoa-sdks/commit/6791b13056daa3302d55ac7127d2f0817f124e3a))
* **node-sdk:** add realtime demo examples ([24ad917](https://github.com/kadoa-org/kadoa-sdks/commit/24ad917f3b64a23f2906ac9a10b989d7e8ac8a1c))
* **node-sdk:** add realtime WebSocket support for live data streaming ([5366b40](https://github.com/kadoa-org/kadoa-sdks/commit/5366b40089c04d541932227d8c2fb0fe0231a592))
* **node-sdk:** add request ID tracking and improve documentation ([aa4afde](https://github.com/kadoa-org/kadoa-sdks/commit/aa4afde99bd165e1e740394ba0b84c6ce384d328))
* **node-sdk:** add submit workflow functionality and refactor internal structure ([1269628](https://github.com/kadoa-org/kadoa-sdks/commit/12696288a45bfbcc2029a0e724eae5942235a92e))
* **node-sdk:** add validation module with rules and anomaly detection ([960f1d2](https://github.com/kadoa-org/kadoa-sdks/commit/960f1d2f2ba640afe8b9f18efac06a0b3baaa6c1))
* **node-sdk:** enhance SDK with comprehensive examples and improved API features ([7aa9b87](https://github.com/kadoa-org/kadoa-sdks/commit/7aa9b87165f3cd82466d8ddb52b8e2e2340177b1))
* **node-sdk:** make entity optional in schema builder API (KAD-3462) ([#101](https://github.com/kadoa-org/kadoa-sdks/issues/101)) ([12e8027](https://github.com/kadoa-org/kadoa-sdks/commit/12e8027296379b842c281a85179073bc955745d9))
* **spec:** update spec fingerprint ([5afb9bb](https://github.com/kadoa-org/kadoa-sdks/commit/5afb9bb5660f20b22103690477dfe02665cf3713))
* **spec:** update spec fingerprint ([100820b](https://github.com/kadoa-org/kadoa-sdks/commit/100820b1d0f3280c63776eca00508b061d8c5076))
* **spec:** update spec fingerprint ([a1ef20f](https://github.com/kadoa-org/kadoa-sdks/commit/a1ef20f05bfe82230403a3f8aaa10b9443580bfc))
* **spec:** update spec fingerprint ([ce5813f](https://github.com/kadoa-org/kadoa-sdks/commit/ce5813f26347cea91c38ab0aabab83ad2f4e0b28))
* **spec:** update spec fingerprint ([c7fd61d](https://github.com/kadoa-org/kadoa-sdks/commit/c7fd61d173aa8c25bac52999a15259089c20f2b9))


### Bug Fixes

* **node-sdk:** add Failed state to WorkflowDisplayStateEnum ([67b7fcf](https://github.com/kadoa-org/kadoa-sdks/commit/67b7fcf423befdef4d7eac6495ffe2e2f78f8a5c))
* **node-sdk:** add workflow update/delete and real-time extraction support ([56f0fbf](https://github.com/kadoa-org/kadoa-sdks/commit/56f0fbfa33cf398a8aca9b2d9619d8621ad3c4b0))
* **node-sdk:** resolve build issues with schemas service and update OpenAPI specs ([da19ba9](https://github.com/kadoa-org/kadoa-sdks/commit/da19ba9fa95aae839aefa3403b9fd747b5b554ce))
* **node-sdk:** update test imports after refactoring ([03f79a6](https://github.com/kadoa-org/kadoa-sdks/commit/03f79a6493f2534532cff1d2adc50c8cb166d2c2))


### Miscellaneous Chores

* **deps-dev:** bump @types/bun from 1.3.0 to 1.3.1 ([#112](https://github.com/kadoa-org/kadoa-sdks/issues/112)) ([20b8fa1](https://github.com/kadoa-org/kadoa-sdks/commit/20b8fa1704e0d21aa2996caabdf8c577424f7283))
* **deps-dev:** bump @types/node from 24.5.2 to 24.7.0 ([#72](https://github.com/kadoa-org/kadoa-sdks/issues/72)) ([16771b3](https://github.com/kadoa-org/kadoa-sdks/commit/16771b30fd0d1c590822c83b5db002c1ef17b6c2))
* **deps-dev:** bump @types/node from 24.7.2 to 24.9.1 ([#114](https://github.com/kadoa-org/kadoa-sdks/issues/114)) ([53c2c45](https://github.com/kadoa-org/kadoa-sdks/commit/53c2c454326de6cc3adf7b48bd53261fa4ecb5f6))
* **deps-dev:** bump @types/node in /examples/node-examples ([#94](https://github.com/kadoa-org/kadoa-sdks/issues/94)) ([94f64a7](https://github.com/kadoa-org/kadoa-sdks/commit/94f64a78b55f68b5e3293361e88595d72783d2ed))
* **deps-dev:** bump @types/node in /sdks/node in the development group ([#102](https://github.com/kadoa-org/kadoa-sdks/issues/102)) ([9523abd](https://github.com/kadoa-org/kadoa-sdks/commit/9523abdd897ecebc021a728522e0d5127fb805a8))
* **deps-dev:** bump @types/node in /sdks/node in the development group ([#65](https://github.com/kadoa-org/kadoa-sdks/issues/65)) ([b81b410](https://github.com/kadoa-org/kadoa-sdks/commit/b81b41002512beed3bad3b4d0f2683c054e3c5f7))
* **deps-dev:** bump @types/node in /sdks/node in the development group ([#79](https://github.com/kadoa-org/kadoa-sdks/issues/79)) ([4a5d514](https://github.com/kadoa-org/kadoa-sdks/commit/4a5d514ed6f65ba08c594e10ecf1b515dd2cf4af))
* **deps-dev:** bump @types/node in /sdks/node in the development group ([#83](https://github.com/kadoa-org/kadoa-sdks/issues/83)) ([a8e484d](https://github.com/kadoa-org/kadoa-sdks/commit/a8e484db668a9acb670977d83cc1b7d3433b5156))
* **deps-dev:** bump @types/node in /sdks/node in the development group ([#91](https://github.com/kadoa-org/kadoa-sdks/issues/91)) ([ef542be](https://github.com/kadoa-org/kadoa-sdks/commit/ef542bedae6669fbf9a0736dd5f8e06078129b66))
* **deps-dev:** bump @types/node in /tools/codegen ([#98](https://github.com/kadoa-org/kadoa-sdks/issues/98)) ([ec79d81](https://github.com/kadoa-org/kadoa-sdks/commit/ec79d8158a27dbf643f1d35c93530a92eca70c91))
* **deps-dev:** bump the development group across 1 directory with 2 updates ([#63](https://github.com/kadoa-org/kadoa-sdks/issues/63)) ([bb15c9a](https://github.com/kadoa-org/kadoa-sdks/commit/bb15c9a42edad7164c9d681f5d1b1a1d98eddc9b))
* **deps-dev:** bump zod from 4.1.5 to 4.1.8 ([#39](https://github.com/kadoa-org/kadoa-sdks/issues/39)) ([6f60c05](https://github.com/kadoa-org/kadoa-sdks/commit/6f60c055fdaf8f50dbf91468b81994dc4c6ec9f3))
* **deps-dev:** bump zod from 4.1.8 to 4.1.11 ([#48](https://github.com/kadoa-org/kadoa-sdks/issues/48)) ([d14cc75](https://github.com/kadoa-org/kadoa-sdks/commit/d14cc759b79997cea1fd5e8db66c45cf930a3c01))
* **deps:** bump @openapitools/openapi-generator-cli in /tools/codegen ([#96](https://github.com/kadoa-org/kadoa-sdks/issues/96)) ([a600e5c](https://github.com/kadoa-org/kadoa-sdks/commit/a600e5c9f9160eed7788e69cb82fdb2717a1b1bc))
* **deps:** bump axios from 1.11.0 to 1.12.2 ([#35](https://github.com/kadoa-org/kadoa-sdks/issues/35)) ([59ce617](https://github.com/kadoa-org/kadoa-sdks/commit/59ce617cddd713e1fee5a43e4d4174986368158b))
* **deps:** bump es-toolkit in /sdks/node in the production group ([#82](https://github.com/kadoa-org/kadoa-sdks/issues/82)) ([ee83d55](https://github.com/kadoa-org/kadoa-sdks/commit/ee83d55927ad30c6c124133ae9916be44d3bbc88))
* **deps:** bump the production group across 1 directory with 2 updates ([#120](https://github.com/kadoa-org/kadoa-sdks/issues/120)) ([0f60da9](https://github.com/kadoa-org/kadoa-sdks/commit/0f60da9586814e22f837d00b25ced35b6d14580a))
* **deps:** bump zod in /sdks/node in the production group ([#78](https://github.com/kadoa-org/kadoa-sdks/issues/78)) ([60397b7](https://github.com/kadoa-org/kadoa-sdks/commit/60397b7f5c15dd4a2d43cb6c9b562ea4765f20a2))
* **deps:** update zod to version 4.1.12 in bun.lock ([3986924](https://github.com/kadoa-org/kadoa-sdks/commit/398692453eed10756bd95e4da91675dac496f557))
* **main:** release node-sdk 0.10.0 ([#53](https://github.com/kadoa-org/kadoa-sdks/issues/53)) ([55cbcbb](https://github.com/kadoa-org/kadoa-sdks/commit/55cbcbb227abec849cd9210938691ed782bd2b38))
* **main:** release node-sdk 0.11.0 ([#55](https://github.com/kadoa-org/kadoa-sdks/issues/55)) ([d328419](https://github.com/kadoa-org/kadoa-sdks/commit/d328419b7284373108183a5595265b3c39832445))
* **main:** release node-sdk 0.12.0 ([#64](https://github.com/kadoa-org/kadoa-sdks/issues/64)) ([9f58624](https://github.com/kadoa-org/kadoa-sdks/commit/9f586248d1734ae4b770a0fedb74bbf5de557424))
* **main:** release node-sdk 0.12.1 ([#68](https://github.com/kadoa-org/kadoa-sdks/issues/68)) ([6bc6eb2](https://github.com/kadoa-org/kadoa-sdks/commit/6bc6eb20a3d69247cc2b465282e9f01eb0d81a05))
* **main:** release node-sdk 0.13.0 ([#77](https://github.com/kadoa-org/kadoa-sdks/issues/77)) ([e16eb26](https://github.com/kadoa-org/kadoa-sdks/commit/e16eb2658dd1b8caf3baf7063dcfd7b702906e49))
* **main:** release node-sdk 0.14.0 ([#80](https://github.com/kadoa-org/kadoa-sdks/issues/80)) ([337b3bd](https://github.com/kadoa-org/kadoa-sdks/commit/337b3bda88573db7d1d7c3d07e33ed3da993a3f8))
* **main:** release node-sdk 0.14.1 ([#87](https://github.com/kadoa-org/kadoa-sdks/issues/87)) ([27d0b16](https://github.com/kadoa-org/kadoa-sdks/commit/27d0b161cff1d3f28237322194aa0d9a0e017dd4))
* **main:** release node-sdk 0.15.0 ([#88](https://github.com/kadoa-org/kadoa-sdks/issues/88)) ([3b1a13e](https://github.com/kadoa-org/kadoa-sdks/commit/3b1a13e65046c2b1db91ec8acc48f3b731583ddc))
* **main:** release node-sdk 0.15.1 ([#122](https://github.com/kadoa-org/kadoa-sdks/issues/122)) ([2594850](https://github.com/kadoa-org/kadoa-sdks/commit/25948501eb695ea0783d81a9d8c9a201001df204))
* **main:** release node-sdk 0.6.0 ([#26](https://github.com/kadoa-org/kadoa-sdks/issues/26)) ([daf584a](https://github.com/kadoa-org/kadoa-sdks/commit/daf584a73d5a19cf7e6b04389137232666a07d04))
* **main:** release node-sdk 0.7.0 ([#32](https://github.com/kadoa-org/kadoa-sdks/issues/32)) ([4043d96](https://github.com/kadoa-org/kadoa-sdks/commit/4043d96a79b0634917314c93c51cce2f40bb70cb))
* **main:** release node-sdk 0.8.0 ([#43](https://github.com/kadoa-org/kadoa-sdks/issues/43)) ([ed5a59b](https://github.com/kadoa-org/kadoa-sdks/commit/ed5a59b984fab0af858c8dfb7e95030d1a048886))
* **main:** release node-sdk 0.9.0 ([#52](https://github.com/kadoa-org/kadoa-sdks/issues/52)) ([f3276f7](https://github.com/kadoa-org/kadoa-sdks/commit/f3276f74f157fb3cdb65c0cb6be3a87323dc639b))
* **spec:** update OpenAPI spec ([#100](https://github.com/kadoa-org/kadoa-sdks/issues/100)) ([46631ff](https://github.com/kadoa-org/kadoa-sdks/commit/46631ffa9b13e3ce0f21d7d9551d37688c2d64aa))
* **spec:** update OpenAPI spec ([#34](https://github.com/kadoa-org/kadoa-sdks/issues/34)) ([76b0093](https://github.com/kadoa-org/kadoa-sdks/commit/76b009372a2a163533cbae2624e44c3ba85cdedb))
* **spec:** update OpenAPI spec ([#51](https://github.com/kadoa-org/kadoa-sdks/issues/51)) ([eec722e](https://github.com/kadoa-org/kadoa-sdks/commit/eec722e747c265cb5d5538185626c4b02b2a782f))
* **spec:** update OpenAPI spec ([#54](https://github.com/kadoa-org/kadoa-sdks/issues/54)) ([6e1a6a8](https://github.com/kadoa-org/kadoa-sdks/commit/6e1a6a8910c77ce1f5171e151957b89938ebbedc))
* **spec:** update OpenAPI spec ([#66](https://github.com/kadoa-org/kadoa-sdks/issues/66)) ([ab44f94](https://github.com/kadoa-org/kadoa-sdks/commit/ab44f946ba0e6da9f5ffc383eaeedcb4fe932bc9))
* **spec:** update OpenAPI spec ([#67](https://github.com/kadoa-org/kadoa-sdks/issues/67)) ([af0d253](https://github.com/kadoa-org/kadoa-sdks/commit/af0d253b6a73fd5f498dd870c533e6e24190180c))
* **spec:** update OpenAPI spec ([#81](https://github.com/kadoa-org/kadoa-sdks/issues/81)) ([a6ca334](https://github.com/kadoa-org/kadoa-sdks/commit/a6ca3348b5000fa4672118eecb0778f8c3453cc7))
* **spec:** update OpenAPI spec ([#86](https://github.com/kadoa-org/kadoa-sdks/issues/86)) ([ca6b132](https://github.com/kadoa-org/kadoa-sdks/commit/ca6b132f4dbb2b62c73c6409b5191354ccdef236))
* **spec:** update OpenAPI spec ([#92](https://github.com/kadoa-org/kadoa-sdks/issues/92)) ([57cb113](https://github.com/kadoa-org/kadoa-sdks/commit/57cb113cd6f18ceed8875e5b640522334f6c853b))


### Code Refactoring

* clean up examples and update client configuration ([66349de](https://github.com/kadoa-org/kadoa-sdks/commit/66349defd0c43d544359703db18d8ed2130f3543))
* **node-sdk:** consolidate API key environment variables ([388293a](https://github.com/kadoa-org/kadoa-sdks/commit/388293ac4696227b54f403f1def14340df6acb6c))
* **node-sdk:** migrate from command/query pattern to service pattern ([134b0dd](https://github.com/kadoa-org/kadoa-sdks/commit/134b0dd7e79502d443b7ee73a4d87945bd7c51b3))
* **node-sdk:** migrate from modules to internal/domains architecture ([636176e](https://github.com/kadoa-org/kadoa-sdks/commit/636176e08dc0048da715af2ce5d2ebf7cad94b07))
* **node-sdk:** restructure with domain-first architecture and ACLs ([3c70296](https://github.com/kadoa-org/kadoa-sdks/commit/3c702969162a340faf4c734e6f0293308f5760de))


### Documentation

* add comprehensive SDK documentation for validation and notifications ([0bdf28b](https://github.com/kadoa-org/kadoa-sdks/commit/0bdf28bc4f2d6a6bf31da0f6ff2cabb9d07bb5c9))
* **node-sdk:** update README with builder API documentation ([96b377f](https://github.com/kadoa-org/kadoa-sdks/commit/96b377fce677a37b56bb2410313b705d91f2c178))
* **node-sdk:** update terminology from metadata to raw fields in schema guide ([7d6c865](https://github.com/kadoa-org/kadoa-sdks/commit/7d6c8654789698ac7ec50c714785ac6cf1299e9c))


### Styles

* convert indentation from tabs to spaces ([b12e3aa](https://github.com/kadoa-org/kadoa-sdks/commit/b12e3aa1dd5e22e1bfdc5be4efcc9a476a450ddc))

## [0.15.1](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.15.0...node-sdk-v0.15.1) (2025-11-03)


### Bug Fixes

* **node-sdk:** add workflow update/delete and real-time extraction support ([56f0fbf](https://github.com/kadoa-org/kadoa-sdks/commit/56f0fbfa33cf398a8aca9b2d9619d8621ad3c4b0))


### Miscellaneous Chores

* **deps-dev:** bump @types/bun from 1.3.0 to 1.3.1 ([#112](https://github.com/kadoa-org/kadoa-sdks/issues/112)) ([20b8fa1](https://github.com/kadoa-org/kadoa-sdks/commit/20b8fa1704e0d21aa2996caabdf8c577424f7283))
* **deps-dev:** bump @types/node from 24.7.2 to 24.9.1 ([#114](https://github.com/kadoa-org/kadoa-sdks/issues/114)) ([53c2c45](https://github.com/kadoa-org/kadoa-sdks/commit/53c2c454326de6cc3adf7b48bd53261fa4ecb5f6))
* **deps-dev:** bump @types/node in /sdks/node in the development group ([#102](https://github.com/kadoa-org/kadoa-sdks/issues/102)) ([9523abd](https://github.com/kadoa-org/kadoa-sdks/commit/9523abdd897ecebc021a728522e0d5127fb805a8))
* **deps:** bump the production group across 1 directory with 2 updates ([#120](https://github.com/kadoa-org/kadoa-sdks/issues/120)) ([0f60da9](https://github.com/kadoa-org/kadoa-sdks/commit/0f60da9586814e22f837d00b25ced35b6d14580a))
* **spec:** update OpenAPI spec ([#100](https://github.com/kadoa-org/kadoa-sdks/issues/100)) ([46631ff](https://github.com/kadoa-org/kadoa-sdks/commit/46631ffa9b13e3ce0f21d7d9551d37688c2d64aa))

## [0.15.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.14.1...node-sdk-v0.15.0) (2025-10-16)


### Features

* **node-sdk:** make entity optional in schema builder API (KAD-3462) ([#101](https://github.com/kadoa-org/kadoa-sdks/issues/101)) ([12e8027](https://github.com/kadoa-org/kadoa-sdks/commit/12e8027296379b842c281a85179073bc955745d9))


### Bug Fixes

* **node-sdk:** add Failed state to WorkflowDisplayStateEnum ([67b7fcf](https://github.com/kadoa-org/kadoa-sdks/commit/67b7fcf423befdef4d7eac6495ffe2e2f78f8a5c))


### Miscellaneous Chores

* **deps-dev:** bump @types/node in /examples/node-examples ([#94](https://github.com/kadoa-org/kadoa-sdks/issues/94)) ([94f64a7](https://github.com/kadoa-org/kadoa-sdks/commit/94f64a78b55f68b5e3293361e88595d72783d2ed))
* **deps-dev:** bump @types/node in /sdks/node in the development group ([#91](https://github.com/kadoa-org/kadoa-sdks/issues/91)) ([ef542be](https://github.com/kadoa-org/kadoa-sdks/commit/ef542bedae6669fbf9a0736dd5f8e06078129b66))
* **deps-dev:** bump @types/node in /tools/codegen ([#98](https://github.com/kadoa-org/kadoa-sdks/issues/98)) ([ec79d81](https://github.com/kadoa-org/kadoa-sdks/commit/ec79d8158a27dbf643f1d35c93530a92eca70c91))
* **deps:** bump @openapitools/openapi-generator-cli in /tools/codegen ([#96](https://github.com/kadoa-org/kadoa-sdks/issues/96)) ([a600e5c](https://github.com/kadoa-org/kadoa-sdks/commit/a600e5c9f9160eed7788e69cb82fdb2717a1b1bc))
* **spec:** update OpenAPI spec ([#92](https://github.com/kadoa-org/kadoa-sdks/issues/92)) ([57cb113](https://github.com/kadoa-org/kadoa-sdks/commit/57cb113cd6f18ceed8875e5b640522334f6c853b))

## [0.14.1](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.14.0...node-sdk-v0.14.1) (2025-10-12)


### Miscellaneous Chores

* **spec:** update OpenAPI spec ([#86](https://github.com/kadoa-org/kadoa-sdks/issues/86)) ([ca6b132](https://github.com/kadoa-org/kadoa-sdks/commit/ca6b132f4dbb2b62c73c6409b5191354ccdef236))

## [0.14.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.13.0...node-sdk-v0.14.0) (2025-10-11)


### Features

* **spec:** update spec fingerprint ([5afb9bb](https://github.com/kadoa-org/kadoa-sdks/commit/5afb9bb5660f20b22103690477dfe02665cf3713))


### Miscellaneous Chores

* **deps-dev:** bump @types/node in /sdks/node in the development group ([#83](https://github.com/kadoa-org/kadoa-sdks/issues/83)) ([a8e484d](https://github.com/kadoa-org/kadoa-sdks/commit/a8e484db668a9acb670977d83cc1b7d3433b5156))
* **deps:** bump es-toolkit in /sdks/node in the production group ([#82](https://github.com/kadoa-org/kadoa-sdks/issues/82)) ([ee83d55](https://github.com/kadoa-org/kadoa-sdks/commit/ee83d55927ad30c6c124133ae9916be44d3bbc88))
* **spec:** update OpenAPI spec ([#81](https://github.com/kadoa-org/kadoa-sdks/issues/81)) ([a6ca334](https://github.com/kadoa-org/kadoa-sdks/commit/a6ca3348b5000fa4672118eecb0778f8c3453cc7))


### Code Refactoring

* clean up examples and update client configuration ([66349de](https://github.com/kadoa-org/kadoa-sdks/commit/66349defd0c43d544359703db18d8ed2130f3543))
* **node-sdk:** consolidate API key environment variables ([388293a](https://github.com/kadoa-org/kadoa-sdks/commit/388293ac4696227b54f403f1def14340df6acb6c))
* **node-sdk:** restructure with domain-first architecture and ACLs ([3c70296](https://github.com/kadoa-org/kadoa-sdks/commit/3c702969162a340faf4c734e6f0293308f5760de))


### Documentation

* add comprehensive SDK documentation for validation and notifications ([0bdf28b](https://github.com/kadoa-org/kadoa-sdks/commit/0bdf28bc4f2d6a6bf31da0f6ff2cabb9d07bb5c9))


### Styles

* convert indentation from tabs to spaces ([b12e3aa](https://github.com/kadoa-org/kadoa-sdks/commit/b12e3aa1dd5e22e1bfdc5be4efcc9a476a450ddc))

## [0.13.0](https://github.com/kadoa-org/kadoa-sdks/compare/node-sdk-v0.12.1...node-sdk-v0.13.0) (2025-10-07)


### Features

* **node-sdk:** add fluent schema builder with create method ([be5b65d](https://github.com/kadoa-org/kadoa-sdks/commit/be5b65d5d160289c9d256d8627d94521b0d9b109))


### Miscellaneous Chores

* **deps-dev:** bump @types/node from 24.5.2 to 24.7.0 ([#72](https://github.com/kadoa-org/kadoa-sdks/issues/72)) ([16771b3](https://github.com/kadoa-org/kadoa-sdks/commit/16771b30fd0d1c590822c83b5db002c1ef17b6c2))
* **deps-dev:** bump @types/node in /sdks/node in the development group ([#79](https://github.com/kadoa-org/kadoa-sdks/issues/79)) ([4a5d514](https://github.com/kadoa-org/kadoa-sdks/commit/4a5d514ed6f65ba08c594e10ecf1b515dd2cf4af))
* **deps:** bump zod in /sdks/node in the production group ([#78](https://github.com/kadoa-org/kadoa-sdks/issues/78)) ([60397b7](https://github.com/kadoa-org/kadoa-sdks/commit/60397b7f5c15dd4a2d43cb6c9b562ea4765f20a2))


### Documentation

* **node-sdk:** update terminology from metadata to raw fields in schema guide ([7d6c865](https://github.com/kadoa-org/kadoa-sdks/commit/7d6c8654789698ac7ec50c714785ac6cf1299e9c))

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
