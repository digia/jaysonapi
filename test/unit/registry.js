import Registry from '../../src/registry';


describe('Serializer', function () {
  it(`initializes`, function (done) {
    expect(Registry()).to.exist();

    done();
  });

  it(`registers serializers`, function (done) {
    const registry = Registry();

    registry.register('test', {});

    expect(registry.get('test')).to.be.an.object();

    done();
  });

  it(`determines if the registry has a serializer`, function (done) {
    const registry = Registry();

    registry.register('test', {});

    expect(registry.has('test')).to.be.true();

    done();
  });

  it(`removes serializers from the registry`, function (done) {
    const registry = Registry();

    registry.register('test', {});

    registry.remove('test');

    expect(registry.has('test')).to.be.false();

    done();
  });

  it(`return a cloned version of all the registered serializers`, function (done) {
    const registry = Registry();

    registry.register('test', {});

    const serializers = registry.all();

    expect(serializers).to.be.an.object();
    expect(serializers.test).to.be.an.object();

    delete serializers.test;

    const serializers2 = registry.all();

    expect(serializers2).to.be.an.object();
    expect(serializers2.test).to.be.an.object();

    done();
  });

  it(`forces naming convention`, function (done) {
    const registry = Registry();

    registry.register('Test', {});

    expect(registry.has('Test')).to.be.true();
    expect(registry.has('test')).to.be.true();
    expect(registry.has('TEST')).to.be.true();

    done();
  });

  it(`uses a shared registry`, function (done) {
    const registry = Registry();
    const registry2 = Registry();

    registry.register('Test', {});

    expect(registry2.has('Test')).to.be.true();

    done();
  });

  it(`can be emptied`, function (done) {
    const registry = Registry();

    registry.register('Test', {});

    expect(registry.has('Test')).to.be.true();

    registry.empty();

    expect(registry.has('Test')).to.be.false();

    done();
  });
});
