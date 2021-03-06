var rewire = require('rewire');
var semver = require('semver');
var getPreviousVersionsFactory = rewire('./getPreviousVersions');
var Dgeni = require('dgeni');

var mocks = require('../mocks/mocks.js');
var mockPackageFactory = require('../mocks/mockPackage');

describe("getPreviousVersions", function() {
  var getPreviousVersions, child;

  beforeEach(function() {
    child = getPreviousVersionsFactory.__get__('child');

    var mockPackage = mockPackageFactory()
      .factory(getPreviousVersionsFactory);

    var dgeni = new Dgeni([mockPackage]);

    var injector = dgeni.configureInjector();
    getPreviousVersions = injector.get('getPreviousVersions');
  });

  it("should have called exec", function() {
    spyOn(child, 'spawnSync').and.returnValue({});
    getPreviousVersions();
    expect(child.spawnSync).toHaveBeenCalled();
  });

  it("should return an empty list for no tags", function() {
    spyOn(child, 'spawnSync').and.returnValue({});
    expect(getPreviousVersions()).toEqual([]);
  });

  it("should return an array of semvers matching tags", function() {
    spyOn(child, 'spawnSync').and.returnValue({
      status: 0,
      stdout: 'v0.1.1'
    });
    expect(getPreviousVersions()).toEqual([semver('v0.1.1')]);
  });

  it("should match v0.1.1-rc1", function() {
    spyOn(child, 'spawnSync').and.returnValue({
      status: 0,
      stdout: 'v0.1.1-rc1'
    });
    expect(getPreviousVersions()).toEqual([semver('v0.1.1-rc1')]);
  });

  it("should not match v1.1.1.1", function() {
    spyOn(child, 'spawnSync').and.returnValue({
      status: 0,
      stdout: 'v1.1.1.1'
    });
    expect(getPreviousVersions()).toEqual([]);
  });

  it("should not match v1.1.1-rc", function() {
    spyOn(child, 'spawnSync').and.returnValue({
      status: 0,
      stdout: 'v1.1.1-rc'
    });
    expect(getPreviousVersions()).toEqual([]);
  });

  it("should match multiple semvers", function() {
    spyOn(child, 'spawnSync').and.returnValue({
      status: 0,
      stdout: 'v0.1.1\nv0.1.2'
    });
    expect(getPreviousVersions()).toEqual([semver('v0.1.1'), semver('v0.1.2')]);
  });

  it("should sort multiple semvers", function() {
    spyOn(child, 'spawnSync').and.returnValue({
      status: 0,
      stdout: 'v0.1.1\nv0.1.1-rc1'
    });
    expect(getPreviousVersions()).toEqual([semver('v0.1.1-rc1'), semver('v0.1.1')]);
  });


  it("should decorate all versions", function() {
    mocks.decorateVersion.calls.reset();

    spyOn(child, 'spawnSync').and.returnValue({
      status: 0,
      stdout: 'v0.1.1\nv0.1.2'
    });
    var versions = getPreviousVersions();

    expect(mocks.decorateVersion.calls.allArgs())
    .toEqual([
      [semver('v0.1.1')],
      [semver('v0.1.2')]
      ]);
  });


});
