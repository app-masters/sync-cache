# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.19/0.3.20] - 2018-10-31
### Fixed
- Only sync positive IDs on update
- Only sync when is not loading and correct delete reducer

## [0.3.17/0.3.18] - 2018-10-29
### Fixed
- Correct check of keys on populate
- Correct conflict rule date selection


## [0.3.11/0.3.16] - 2018-10-26
### Changed
- Check keys on populate

## [0.3.11/0.3.13] - 2018-10-25
### Changed
- Changed populate and replace methods
- Fixed default rule of conflict
- Checking primaryKey on solveObjects

## [0.3.10] - 2018-10-24
### Added
- Debug log on Saga

## [0.3.0/0.3.9] - 2018-10-23
### Added
- Redux-saga synchronization methods
### Changed 
- Fixed return for syncObjects
- Saga name on saga actions types
- Fixed config iteration on Check_Sync Saga
- Fixed action type call
- Bind everything
- Not sync object with unsychronized relations
- Sync create fix
- Remove cacheObject from store when online is created
- Correct table name on relations

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