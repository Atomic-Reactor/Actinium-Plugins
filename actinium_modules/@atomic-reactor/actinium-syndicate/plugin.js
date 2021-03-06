const path = require('path');
const chalk = require('chalk');
const Enums = require('./enums');
const pkg = require('./package');
const op = require('object-path');

const PLUGIN = {
    ID: 'Syndicate',
    description:
        'Enable Syndicated content to be served across Reactium cloud sites.',
    name: 'Syndicate Plugin',
    order: 100,
    version: {
        actinium: op.get(pkg, 'actinium.version', '>=3.2.6'),
        plugin: op.get(pkg, 'version'),
    },
    bundle: [],
    meta: {
        group: 'Networking',
        settings: true,
        builtIn: true,
    },
};

Actinium.Plugin.addScript(
    PLUGIN.ID,
    path.resolve(__dirname, 'plugin-assets/syndicate.js'),
);
Actinium.Plugin.addStylesheet(
    PLUGIN.ID,
    path.resolve(__dirname, 'plugin-assets/syndicate-plugin.css'),
);

/**
 * ----------------------------------------------------------------------------
 * Extend Actinium SDK
 * ----------------------------------------------------------------------------
 */
const PLUGIN_SDK = require('./sdk');
Actinium['Syndicate'] = op.get(Actinium, 'Syndicate', PLUGIN_SDK);

/**
 * ----------------------------------------------------------------------------
 * Plugin registration
 * ----------------------------------------------------------------------------
 */
Actinium.Plugin.register(PLUGIN, false);

/**
 * ----------------------------------------------------------------------------
 * Hook registration
 * ----------------------------------------------------------------------------
 */
Actinium.Hook.register('schema', async () => {
    if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
    const { SyndicateClient } = require('./schema');
    const { actions = {}, collection, schema = {} } = SyndicateClient;

    if (!collection) return;
    Actinium.Collection.register(collection, actions, schema);
});

Actinium.Hook.register('before-capability-load', async () => {
    // CLP Perms
    Actinium.Capability.register('SyndicateClient.addField', {});
    Actinium.Capability.register('SyndicateClient.create', {});
    Actinium.Capability.register('SyndicateClient.delete', {});
    Actinium.Capability.register('SyndicateClient.retrieve', {});
    Actinium.Capability.register('SyndicateClient.update', {});

    // setting caps
    Actinium.Capability.register('setting.Syndicate-get', {});
    Actinium.Capability.register('setting.Syndicate-set', {});
    Actinium.Capability.register('setting.Syndicate-delete', {});

    // client override
    Actinium.Capability.register('Syndicate.Client', {});

    // Client CRUD
    Actinium.Capability.register('SyndicateClient.create', {});
    Actinium.Capability.register('SyndicateClient.retrieve', {});
    Actinium.Capability.register('SyndicateClient.delete', {});
});

Actinium.Hook.register('warning', () => {
    if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

    const DEFAULT_ACCESS_SECRET = op.get(Enums, 'DEFAULT_ACCESS_SECRET');
    const ACCESS_SECRET = op.get(ENV, 'ACCESS_SECRET', DEFAULT_ACCESS_SECRET);
    const DEFAULT_REFRESH_SECRET = op.get(Enums, 'DEFAULT_REFRESH_SECRET');
    const REFRESH_SECRET = op.get(
        ENV,
        'REFRESH_SECRET',
        DEFAULT_REFRESH_SECRET,
    );

    if (ACCESS_SECRET === DEFAULT_ACCESS_SECRET) {
        WARN('');
        WARN(
            chalk.cyan.bold('Warning:'),
            `ENV.ACCESS_SECRET set to default value ${DEFAULT_ACCESS_SECRET}`,
        );
    }

    if (REFRESH_SECRET === DEFAULT_REFRESH_SECRET) {
        WARN('');
        WARN(
            chalk.cyan.bold('Warning:'),
            `ENV.REFRESH_SECRET set to default value ${DEFAULT_REFRESH_SECRET}`,
        );
    }
});

Actinium.Hook.register('syndicate-content-list', async ({ results = [] }) => {
    const masterOptions = Actinium.Utils.MasterOptions();
    for (const content of results) {
        const { objectId: contentId } = content;
        const { results: urls = {} } = await Actinium.URL.list(
            { contentId },
            masterOptions,
        );

        op.set(content, 'urls', urls);
    }
});

const cloudAPIs = [
    { name: 'syndicate-client-create', sdk: 'Syndicate.Client.create' },
    { name: 'syndicate-client-retrieve', sdk: 'Syndicate.Client.retrieve' },
    { name: 'syndicate-client-delete', sdk: 'Syndicate.Client.delete' },
    { name: 'syndicate-clients', sdk: 'Syndicate.Client.list' },
    { name: 'syndicate-client-token', sdk: 'Syndicate.Client.token' },
    { name: 'syndicate-client-verify', sdk: 'Syndicate.Client.verify' },
    { name: 'syndicate-content-types', sdk: 'Syndicate.Content.types' },
    { name: 'syndicate-content-list', sdk: 'Syndicate.Content.list' },
    {
        name: 'syndicate-content-media-directories',
        sdk: 'Syndicate.Content.mediaDirectories',
    },
    { name: 'syndicate-content-media', sdk: 'Syndicate.Content.media' },
    {
        name: 'syndicate-content-taxonomy-types',
        sdk: 'Syndicate.Content.taxonomyTypes',
    },
    {
        name: 'syndicate-content-taxonomies',
        sdk: 'Syndicate.Content.taxonomies',
    },
    {
        name: 'syndicate-content-taxonomies-attached',
        sdk: 'Syndicate.Content.taxonomiesAttached',
    },
];

cloudAPIs.forEach(({ name, sdk }) =>
    Actinium.Cloud.define(PLUGIN.ID, name, async req => {
        const cloudFunc = op.get(Actinium, sdk, Promise.resolve);
        return cloudFunc(req, Actinium.Utils.CloudRunOptions(req));
    }),
);
