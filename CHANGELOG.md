# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0/0.2.10] - 2018-10-22
### Added
- AMRedux created to deal with default redux actions and dispatches
- Default populate defined on config
### Changed
- Setting empty object on statics of AMRedux
- Correct config on instance
- Adding 'Reducer' on reducer name
- Correct foreignKey on populate
- Accept only valid primaryKey on online methods
- Reducer for updateObjects is mutable
- Plain objects on update
- Populating write methods
- Correct order on update list

## [0.1.3] - 2018-10-18
### Added
- Relationship methods on synchronization

## [0.1.0/0.1.1] - 2018-10-17
### Changed
- _cacheId removed from cache objects, now using negative id for cached data
- After createdObject/updateObject fix

## [0.0.1/0.0.7] - 2018-10-16
### Added
- Sync-Cache creation
- Fixing dependencies
- Adding saveObject Action
- Warning instead of Error on uncaught
- SAVE_ACTION Action on Success
- Boolean private method _needSync on objects