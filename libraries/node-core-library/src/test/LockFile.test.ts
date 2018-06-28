// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

/// <reference types='mocha' />

import { assert } from 'chai';
import * as path from 'path';
import { LockFile, getProcessStartTime, getProcessStartTimeFromProcStat } from '../LockFile';
import { FileSystem } from '../FileSystem';
import { FileWriter } from '../FileWriter';

function setLockFileGetProcessStartTime(fn: (process: number) => string | undefined): void {
  // tslint:disable-next-line:no-any
  (LockFile as any)._getStartTime = fn;
}

describe('LockFile', () => {
  afterEach(() => {
    setLockFileGetProcessStartTime(getProcessStartTime);
  });

  describe('getLockFilePath', () => {
    it('only acceps alphabetical characters for resource name', () => {
      assert.doesNotThrow(() => {
        LockFile.getLockFilePath(process.cwd(), 'foo123');
      });
      assert.doesNotThrow(() => {
        LockFile.getLockFilePath(process.cwd(), 'bar.123');
      });
      assert.doesNotThrow(() => {
        LockFile.getLockFilePath(process.cwd(), 'foo.bar');
      });
      assert.doesNotThrow(() => {
        LockFile.getLockFilePath(process.cwd(), 'lock-file.123');
      });
      assert.throws(() => {
        LockFile.getLockFilePath(process.cwd(), '.foo123');
      });
      assert.throws(() => {
        LockFile.getLockFilePath(process.cwd(), 'foo123.');
      });
      assert.throws(() => {
        LockFile.getLockFilePath(process.cwd(), '-foo123');
      });
      assert.throws(() => {
        LockFile.getLockFilePath(process.cwd(), 'foo123-');
      });
      assert.throws(() => {
        LockFile.getLockFilePath(process.cwd(), '');
      });
    });
  });

  describe('getProcessStartTimeFromProcStat', () => {
    function createStatOutput (value2: string, n: number): string {
      let statOutput: string = `0 ${value2} S`;
      for (let i: number = 0; i < n; i++) {
        statOutput += ' 0';
      }
      return statOutput;
    }

    it('returns undefined if too few values are contained in /proc/[pid]/stat (1)', () => {
      const stat: string = createStatOutput('(bash)', 1);
      const ret: string|undefined = getProcessStartTimeFromProcStat(stat);
      assert.strictEqual(ret, undefined);
    });
    it('returns undefined if too few values are contained in /proc/[pid]/stat (2)', () => {
      const stat: string = createStatOutput('(bash)', 0);
      const ret: string|undefined = getProcessStartTimeFromProcStat(stat);
      assert.strictEqual(ret, undefined);
    });
    it('returns the correct start time if the second value in /proc/[pid]/stat contains spaces', () => {
      let stat: string = createStatOutput('(bash 2)', 18);
      const value22: string = '12345';
      stat += ` ${value22}`;
      const ret: string|undefined = getProcessStartTimeFromProcStat(stat);
      assert.strictEqual(ret, value22);
    });
    it('returns the correct start time if there are 22 values in /proc/[pid]/stat, including a trailing line '
      + 'terminator', () => {
      let stat: string = createStatOutput('(bash)', 18);
      const value22: string = '12345';
      stat += ` ${value22}\n`;
      const ret: string|undefined = getProcessStartTimeFromProcStat(stat);
      assert.strictEqual(ret, value22);
    });
    it('returns the correct start time if the second value in /proc/[pid]/stat does not contain spaces', () => {
      let stat: string = createStatOutput('(bash)', 18);
      const value22: string = '12345';
      stat += ` ${value22}`;
      const ret: string|undefined = getProcessStartTimeFromProcStat(stat);
      assert.strictEqual(ret, value22);
    });
  });

  if (process.platform === 'darwin' || process.platform === 'linux') {
    describe('Linux and Mac', () => {
      describe('getLockFilePath()', () => {
        it('returns a resolved path containing the pid', () => {
          assert.equal(
            path.join(process.cwd(), `test#${process.pid}.lock`),
            LockFile.getLockFilePath('./', 'test')
          );
        });

        it('allows for overridden pid', () => {
          assert.equal(
            path.join(process.cwd(), `test#99.lock`),
            LockFile.getLockFilePath('./', 'test', 99)
          );
        });
      });

      it('can acquire and close a clean lockfile', () => {
        // ensure test folder is clean
        const testFolder: string = path.join(__dirname, '1');
        FileSystem.emptyFolder(testFolder);

        const resourceName: string = 'test';
        const pidLockFileName: string = LockFile.getLockFilePath(testFolder, resourceName);
        const lock: LockFile | undefined = LockFile.tryAcquire(testFolder, resourceName);

        // The lockfile should exist and be in a clean state
        assert.isDefined(lock);
        assert.isFalse(lock!.dirtyWhenAcquired);
        assert.isFalse(lock!.isReleased);
        assert.isTrue(FileSystem.exists(pidLockFileName));

        // Ensure that we can release the "clean" lockfile
        lock!.release();
        assert.isFalse(FileSystem.exists(pidLockFileName));
        assert.isTrue(lock!.isReleased);

        // Ensure we cannot release the lockfile twice
        assert.throws(() => {
          lock!.release();
        });
      });

      it('cannot acquire a lock if another valid lock exists', () => {
        // ensure test folder is clean
        const testFolder: string = path.join(__dirname, '2');
        FileSystem.emptyFolder(testFolder);

        const otherPid: number = 999999999;
        const otherPidStartTime: string = '2012-01-02 12:53:12';

        const resourceName: string = 'test';

        const otherPidLockFileName: string = LockFile.getLockFilePath(testFolder, resourceName, otherPid);

        setLockFileGetProcessStartTime((pid: number) => {
          return pid === process.pid ? getProcessStartTime(process.pid) : otherPidStartTime;
        });

        // create an open lockfile
        const lockFileHandle: FileWriter = FileWriter.open(otherPidLockFileName);
        lockFileHandle.write(otherPidStartTime);
        lockFileHandle.close();
        FileSystem.updateTimes(otherPidLockFileName, 10000, 10000);

        const lock: LockFile | undefined = LockFile.tryAcquire(testFolder, resourceName);

        // this lock should be undefined since there is an existing lock
        assert.isUndefined(lock);
      });
    });
  }

  if (process.platform === 'win32') {
    describe('getLockFilePath()', () => {
      it('returns a resolved path that doesn\'t contain', () => {
        assert.equal(
          path.join(process.cwd(), `test.lock`),
          LockFile.getLockFilePath('./', 'test')
        );
      });

      it('ignores pid that is passed in', () => {
        assert.equal(
          path.join(process.cwd(), `test.lock`),
          LockFile.getLockFilePath('./', 'test', 99)
        );
      });
    });

    it('will not acquire if existing lock is there', () => {
      // ensure test folder is clean
      const testFolder: string = path.join(__dirname, '1');
      FileSystem.deleteFolder(testFolder);
      FileSystem.createFolder(testFolder);

      // create an open lockfile
      const resourceName: string = 'test';
      const lockFileName: string = LockFile.getLockFilePath(testFolder, resourceName);
      const lockFileHandle: FileWriter = FileWriter.open(lockFileName, { exclusive: true });

      const lock: LockFile | undefined = LockFile.tryAcquire(testFolder, resourceName);

      // this lock should be undefined since there is an existing lock
      assert.isUndefined(lock);
      lockFileHandle.close();
    });

    it('can acquire and close a dirty lockfile', () => {
      // ensure test folder is clean
      const testFolder: string = path.join(__dirname, '1');
      FileSystem.deleteFolder(testFolder);
      FileSystem.createFolder(testFolder);

      // Create a lockfile that is still hanging around on disk,
      const resourceName: string = 'test';
      const lockFileName: string = LockFile.getLockFilePath(testFolder, resourceName);
      FileWriter.open(lockFileName, { exclusive: true }).close();

      const lock: LockFile | undefined = LockFile.tryAcquire(testFolder, resourceName);

      assert.isDefined(lock);
      assert.isTrue(lock!.dirtyWhenAcquired);
      assert.isFalse(lock!.isReleased);
      assert.isTrue(FileSystem.exists(lockFileName));

      // Ensure that we can release the "dirty" lockfile
      lock!.release();
      assert.isFalse(FileSystem.exists(lockFileName));
      assert.isTrue(lock!.isReleased);
    });

    it('can acquire and close a clean lockfile', () => {
      // ensure test folder is clean
      const testFolder: string = path.join(__dirname, '1');
      FileSystem.deleteFolder(testFolder);
      FileSystem.createFolder(testFolder);

      const resourceName: string = 'test';
      const lockFileName: string = LockFile.getLockFilePath(testFolder, resourceName);
      const lock: LockFile | undefined = LockFile.tryAcquire(testFolder, resourceName);

      // The lockfile should exist and be in a clean state
      assert.isDefined(lock);
      assert.isFalse(lock!.dirtyWhenAcquired);
      assert.isFalse(lock!.isReleased);
      assert.isTrue(FileSystem.exists(lockFileName));

      // Ensure that we can release the "clean" lockfile
      lock!.release();
      assert.isFalse(FileSystem.exists(lockFileName));
      assert.isTrue(lock!.isReleased);

      // Ensure we cannot release the lockfile twice
      assert.throws(() => {
        lock!.release();
      });
    });
  }
});