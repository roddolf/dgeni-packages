var rewire = require('rewire');
var semver = require('semver');
var Dgeni = require('dgeni');

var mocks = require('../mocks/mocks.js');
var mockPackageFactory = require('../mocks/mockPackage');

var versionInfoFactory = rewire('./versionInfo.js');


describe("versionInfo", function() {
  var versionInfo, mockPackage, gitMocks, ciBuild;

  beforeEach(function() {
    mocks.getPreviousVersions.calls.reset();

    var child = versionInfoFactory.__get__('child');

    gitMocks = {
      rev: mocks.mockGitRevParse,
      describe: mocks.mockDefaultFail,
      cat: mocks.mockDefaultFail
    };

    spyOn(child, 'spawnSync').and.callFake(function (command, args) {
      if (args[0] === 'rev-parse') {
        return gitMocks.rev;
      } else if (args[0] === 'describe') {
        return gitMocks.describe;
      } else if (args[0] === 'cat-file') {
        return gitMocks.cat;
      } else {
        return mocks.mockDefaultFail;
      }
    });

    mockPackage = mockPackageFactory()
      .factory(versionInfoFactory);

    var dgeni = new Dgeni([mockPackage]);

    var injector = dgeni.configureInjector();
    versionInfo = injector.get('versionInfo');

    ciBuild = process.env.TRAVIS_BUILD_NUMBER;
  });

  afterEach(function() {
    process.env.TRAVIS_BUILD_NUMBER = ciBuild;
  });

  describe("currentPackage", function() {
    it("should be set", function() {
      expect(versionInfo.currentPackage).not.toBe(null);
    });

    it("should be set to passed in package", function() {
      expect(versionInfo.currentPackage).toBe(mocks.packageWithVersion);
    });
  });

  it("should set gitRepoInfo", function() {
    expect(versionInfo.gitRepoInfo).toBe(mocks.gitRepoInfo);
  });

  describe("previousVersions", function() {
    it("should call getPreviousVersions", function() {
      expect(mocks.getPreviousVersions.calls.all().length).toEqual(1);
      expect(mocks.getPreviousVersions).toHaveBeenCalled();
    });

    it("should equal getPreviousVersions", function() {
      expect(mocks.getPreviousVersions.calls.all().length).toEqual(1);
      expect(versionInfo.previousVersions).toEqual(mocks.getPreviousVersions());
    });
  });

  describe("currentVersion with no tag", function() {
    it("should have isSnapshot set to true", function() {
      expect(versionInfo.currentVersion.isSnapshot).toBe(true);
    });

    it("should have codeName of snapshot", function() {
      expect(versionInfo.currentVersion.codeName).toBe('snapshot');
    });

    it("should have the commitSHA set", function() {
      expect(versionInfo.currentVersion.commitSHA).toBe(mocks.mockGitRevParse.stdout);
    });

    describe("with branchVersion/Pattern", function() {
      beforeEach(function() {
        versionInfo = versionInfoFactory(
          function(){},
          mocks.packageWithBranchVersion
        );
      });

      it("should satisfy the branchVersion", function() {
        expect(semver.satisfies(versionInfo.currentVersion, mocks.packageWithBranchVersion.branchVersion))
          .toBeTruthy();
      });

      it("should have a prerelease", function() {
        expect(versionInfo.currentVersion.prerelease).toBeTruthy();
      });
    });

    describe("with no BUILD_NUMBER", function() {
      it("should have a local prerelease", function() {
        delete process.env.TRAVIS_BUILD_NUMBER;

        versionInfo = versionInfoFactory(
          function() {},
          mocks.packageWithVersion
        );

        expect(versionInfo.currentVersion.prerelease[0]).toBe('local');
      });
    });

    describe("with a BUILD_NUMBER", function() {
      it("should have a build prerelease", function() {
        process.env.TRAVIS_BUILD_NUMBER = '10';

        versionInfo = versionInfoFactory(
          function() {},
          mocks.packageWithVersion
        );

        expect(versionInfo.currentVersion.prerelease[0]).toBe('build');
        expect(versionInfo.currentVersion.prerelease[1]).toBe('10');
      });
    });
  });


  describe("currentVersion with annotated tag", function() {

    beforeEach(function() {
      gitMocks.cat = mocks.mockGitCatFile;
      gitMocks.describe = mocks.mockGitDescribe;

      versionInfo = versionInfoFactory(
        function() {},
        mocks.packageWithVersion
      );
    });

    it("should have a version matching the tag", function() {
      var tag = gitMocks.describe.stdout.trim();
      var version = semver.parse(tag);
      expect(versionInfo.currentVersion.version).toBe(version.version);
    });

    it("should pull the codeName from the tag", function() {
      expect(versionInfo.currentVersion.codeName).toBe('mockCodeName');
    });

    it("should set codeName to null if it doesn't have a codename specified", function() {
      gitMocks.cat = mocks.mockGitCatFileNoCodeName;

      var dgeni = new Dgeni([mockPackage]);
      var injector = dgeni.configureInjector();
      versionInfo = injector.get('versionInfo');
      expect(versionInfo.currentVersion.codeName).toBe(null);
    });

    it("should set codeName to falsy if it has a badly formatted codename", function() {
      gitMocks.cat = mocks.mockGitCatFileBadFormat;

      var dgeni = new Dgeni([mockPackage]);
      var injector = dgeni.configureInjector();
      versionInfo = injector.get('versionInfo');
      expect(versionInfo.currentVersion.codeName).toBeFalsy();
    });

    it("should have the commitSHA set", function() {
      expect(versionInfo.currentVersion.commitSHA).toBe(mocks.mockGitRevParse.stdout);
    });
  });


});
